import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useDeviceStatus } from "@/hooks/useDeviceStatus";
import { useForceStreamState } from "@/hooks/useForceStreamState";
import { createMaxWeightRecord } from "@/features/max-weight/api";
import { ForceBarGauge } from "@/features/max-weight/ForceBarGauge";
import { MaxWeightHistoryChart } from "@/features/max-weight/MaxWeightHistoryChart";
import { maxWeightQueryKeys, useCurrentMaxWeights, useMaxWeightHistory } from "@/features/max-weight/hooks";
import type { CreateMaxWeightRecordInput } from "@/features/max-weight/models";
import { useMaxWeightMeasurement } from "@/features/max-weight/useMaxWeightMeasurement";
import { ApiClientError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

function formatWeight(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value) || value <= 0) {
    return "Not recorded";
  }

  return `${value.toFixed(1)} kg`;
}

function toInputWeight(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return (Object.is(value, -0) ? 0 : value).toFixed(1);
}

function hasRecordedWeight(record: CreateMaxWeightRecordInput): boolean {
  return record.leftWeightKg != null || record.rightWeightKg != null;
}

function hasCompleteMeasuredWeights(record: CreateMaxWeightRecordInput): boolean {
  return typeof record.leftWeightKg === "number"
    && Number.isFinite(record.leftWeightKg)
    && record.leftWeightKg > 0
    && typeof record.rightWeightKg === "number"
    && Number.isFinite(record.rightWeightKg)
    && record.rightWeightKg > 0;
}

function getRecordedWeightLabel(record: CreateMaxWeightRecordInput): string {
  if (record.leftWeightKg != null && record.rightWeightKg != null) {
    return "Max weights";
  }

  return record.leftWeightKg != null ? "Left hand max weight" : "Right hand max weight";
}

export function MaxWeightPage() {
  const queryClient = useQueryClient();
  const currentQuery = useCurrentMaxWeights();
  const historyQuery = useMaxWeightHistory();
  const { status: deviceStatus, isReconnecting, reconnectionFailed } = useDeviceStatus();
  const { isForceStreamActive } = useForceStreamState();
  const measurement = useMaxWeightMeasurement();

  const [leftWeightKg, setLeftWeightKg] = useState("");
  const [rightWeightKg, setRightWeightKg] = useState("");
  const [isLeftWeightDirty, setIsLeftWeightDirty] = useState(false);
  const [isRightWeightDirty, setIsRightWeightDirty] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSavingManualRecord, setIsSavingManualRecord] = useState(false);
  const [measurementSaveError, setMeasurementSaveError] = useState<string | null>(null);
  const [isSavingMeasurements, setIsSavingMeasurements] = useState(false);
  const [isCancellingMeasurements, setIsCancellingMeasurements] = useState(false);

  const currentCards = useMemo(
    () => [
      { label: "Left Hand", value: currentQuery.data?.leftKg },
      { label: "Right Hand", value: currentQuery.data?.rightKg },
    ],
    [currentQuery.data],
  );

  const measurementScaleKg = Math.max(
    10,
    measurement.currentForceKg,
    measurement.leftPeakKg,
    measurement.rightPeakKg,
    currentQuery.data?.leftKg ?? 0,
    currentQuery.data?.rightKg ?? 0,
  );
  const measurementsToSave = useMemo<CreateMaxWeightRecordInput>(
    () => ({
      leftWeightKg: measurement.leftPeakKg > 0 ? measurement.leftPeakKg : null,
      rightWeightKg: measurement.rightPeakKg > 0 ? measurement.rightPeakKg : null,
    }),
    [measurement.leftPeakKg, measurement.rightPeakKg],
  );
  const hasMeasurementsToSave = hasRecordedWeight(measurementsToSave);
  const hasActiveOrPendingMeasurements = measurement.isStreaming || hasMeasurementsToSave;
  const hasCompleteMeasurementsToSave = hasCompleteMeasuredWeights(measurementsToSave);
  const hasStreamConflict = isForceStreamActive && !measurement.isStreaming;
  const isMeasurementActionDisabled = measurement.isBusy
    || (!measurement.isStreaming && (!deviceStatus.isConnected || hasStreamConflict));
  const canSaveMeasurements = hasCompleteMeasurementsToSave
    && !measurement.isBusy
    && !isSavingMeasurements
    && !isCancellingMeasurements;
  const canCancelMeasurements = hasActiveOrPendingMeasurements
    && !measurement.isBusy
    && !isSavingMeasurements
    && !isCancellingMeasurements;
  const canRecordManually = leftWeightKg.trim() !== ""
    && rightWeightKg.trim() !== ""
    && !isSavingManualRecord;
  const showMeasurementLiveUi = measurement.isStreaming;
  const showMeasurementResults = measurement.isStreaming || hasMeasurementsToSave;

  useEffect(() => {
    if (!isLeftWeightDirty) {
      setLeftWeightKg(toInputWeight(currentQuery.data?.leftKg));
    }
  }, [currentQuery.data?.leftKg, isLeftWeightDirty]);

  useEffect(() => {
    if (!isRightWeightDirty) {
      setRightWeightKg(toInputWeight(currentQuery.data?.rightKg));
    }
  }, [currentQuery.data?.rightKg, isRightWeightDirty]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);

    let nextLeftWeightKg: number | null = null;
    if (leftWeightKg.trim() !== "") {
      const parsedLeftWeightKg = Number(leftWeightKg);
      if (!Number.isFinite(parsedLeftWeightKg) || parsedLeftWeightKg <= 0) {
        setFormError("Left weight must be greater than 0.");
        return;
      }

      nextLeftWeightKg = parsedLeftWeightKg;
    }

    let nextRightWeightKg: number | null = null;
    if (rightWeightKg.trim() !== "") {
      const parsedRightWeightKg = Number(rightWeightKg);
      if (!Number.isFinite(parsedRightWeightKg) || parsedRightWeightKg <= 0) {
        setFormError("Right weight must be greater than 0.");
        return;
      }

      nextRightWeightKg = parsedRightWeightKg;
    }

    const recordToCreate: CreateMaxWeightRecordInput = {
      leftWeightKg: nextLeftWeightKg,
      rightWeightKg: nextRightWeightKg,
    };

    if (!hasCompleteMeasuredWeights(recordToCreate)) {
      setFormError("Enter a weight greater than 0 for both hands.");
      return;
    }

    try {
      setIsSavingManualRecord(true);
      await createMaxWeightRecord(recordToCreate);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: maxWeightQueryKeys.current }),
        queryClient.invalidateQueries({ queryKey: maxWeightQueryKeys.history }),
      ]);

      setIsLeftWeightDirty(false);
      setIsRightWeightDirty(false);
      toast.success(`${getRecordedWeightLabel(recordToCreate)} recorded.`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
      } else {
        setFormError("Failed to record max weight.");
      }
    } finally {
      setIsSavingManualRecord(false);
    }
  }

  async function handleSaveMeasurements(): Promise<void> {
    const recordToCreate = measurementsToSave;
    if (!hasCompleteMeasuredWeights(recordToCreate)) {
      setMeasurementSaveError("Measure both hands before saving.");
      return;
    }

    setMeasurementSaveError(null);
    setIsSavingMeasurements(true);

    try {
      if (measurement.isStreaming) {
        const stopped = await measurement.stop();
        if (!stopped) {
          return;
        }
      }

      await createMaxWeightRecord(recordToCreate);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: maxWeightQueryKeys.current }),
        queryClient.invalidateQueries({ queryKey: maxWeightQueryKeys.history }),
      ]);

      measurement.resetPeaks();
      toast.success(`${getRecordedWeightLabel(recordToCreate)} recorded from measurement.`);
    } catch (error) {
      if (error instanceof ApiClientError) {
        setMeasurementSaveError(error.message);
      } else {
        setMeasurementSaveError("Failed to save measured max weights.");
      }
    } finally {
      setIsSavingMeasurements(false);
    }
  }

  async function handleCancelMeasurements(): Promise<void> {
    setMeasurementSaveError(null);
    setIsCancellingMeasurements(true);

    try {
      if (measurement.isStreaming) {
        const stopped = await measurement.stop();
        if (!stopped) {
          return;
        }
      }

      measurement.resetPeaks();
      toast.success("Measurements discarded.");
    } finally {
      setIsCancellingMeasurements(false);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold">Max Weight</h1>
        <p className="text-sm text-muted-foreground">
          Record per-hand max measurements over time and use the latest values as the repeater target reference.
        </p>
      </div>

      <div className="grid gap-4 grid-cols-2">
        {currentCards.map((card) => (
          <div key={card.label} className="rounded-lg border bg-card px-4 py-3">
            <p className="text-sm text-muted-foreground">{card.label}</p>
            {currentQuery.isLoading ? (
              <Skeleton className="mt-1 h-7 w-20" />
            ) : (
              <p className="mt-1 text-xl font-semibold tabular-nums">{formatWeight(card.value)}</p>
            )}
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Measure with Progressor</CardTitle>
            <CardDescription>
              Measure each hand with a live force gauge, then save the recorded peaks as your new max weights.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {showMeasurementLiveUi ? (
                <div className="flex justify-center">
                  <div className="inline-flex rounded-lg border bg-muted/40 p-1">
                    {(["Left", "Right"] as const).map((handOption) => (
                      <Button
                        key={handOption}
                        type="button"
                        size="sm"
                        variant={measurement.activeHand === handOption ? "default" : "ghost"}
                        className="min-w-28"
                        onClick={() => measurement.setActiveHand(handOption)}
                      >
                        {handOption} Hand
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}

              {hasStreamConflict ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  Another force stream is already running. Stop it before measuring max weight here.
                </p>
              ) : null}

              {!deviceStatus.isConnected && !measurement.isStreaming ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  Connect to the Progressor before starting a max-weight measurement.
                </p>
              ) : null}

              {isReconnecting && measurement.isStreaming ? (
                <p className="rounded-md border border-amber-300 bg-amber-50 px-3 py-2 text-sm text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
                  BLE connection lost. Trying to reconnect before the measurement is stopped.
                </p>
              ) : null}

              {reconnectionFailed && measurement.isStreaming ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  Could not reconnect to the device. The measurement stream has been stopped.
                </p>
              ) : null}

              {measurement.error ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {measurement.error}
                </p>
              ) : null}

              {measurementSaveError ? (
                <p className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {measurementSaveError}
                </p>
              ) : null}

              {showMeasurementLiveUi ? (
                <ForceBarGauge
                  currentForceKg={measurement.currentForceKg}
                  leftPeakKg={measurement.leftPeakKg}
                  rightPeakKg={measurement.rightPeakKg}
                  maxScaleKg={measurementScaleKg}
                  className="mx-auto w-full max-w-sm"
                />
              ) : null}

              {showMeasurementResults ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Left hand max</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">{formatWeight(measurement.leftPeakKg)}</p>
                  </div>

                  <div className="rounded-lg border bg-muted/20 p-4">
                    <p className="text-sm text-muted-foreground">Right hand max</p>
                    <p className="mt-2 text-2xl font-semibold tabular-nums">{formatWeight(measurement.rightPeakKg)}</p>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap gap-2">
                {hasActiveOrPendingMeasurements ? (
                  <>
                    <Button
                      type="button"
                      onClick={() => void handleSaveMeasurements()}
                      disabled={!canSaveMeasurements}
                    >
                      {isSavingMeasurements ? "Saving..." : "Save Measurements"}
                    </Button>

                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => void handleCancelMeasurements()}
                      disabled={!canCancelMeasurements}
                    >
                      {isCancellingMeasurements ? "Cancelling..." : "Cancel Measurements"}
                    </Button>
                  </>
                ) : (
                  <Button
                    type="button"
                    onClick={() => void measurement.start()}
                    disabled={isMeasurementActionDisabled}
                  >
                    {measurement.isBusy ? "Working..." : "Start Measurement"}
                  </Button>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Record manually</CardTitle>
            <CardDescription>
              Enter max weights directly if you already know the values for both hands.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={handleSubmit}>
              <div className="grid gap-4 grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="max-weight-left">Left (kg)</Label>
                  <Input
                    id="max-weight-left"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={leftWeightKg}
                    onChange={(event) => {
                      setLeftWeightKg(event.target.value);
                      setIsLeftWeightDirty(true);
                    }}
                    disabled={isSavingManualRecord}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="max-weight-right">Right (kg)</Label>
                  <Input
                    id="max-weight-right"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={rightWeightKg}
                    onChange={(event) => {
                      setRightWeightKg(event.target.value);
                      setIsRightWeightDirty(true);
                    }}
                    disabled={isSavingManualRecord}
                  />
                </div>
              </div>

              <Button type="submit" disabled={!canRecordManually}>
                Record
              </Button>
            </form>

            {formError ? <p className="mt-3 text-sm text-destructive">{formError}</p> : null}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
        </CardHeader>
        <CardContent>
          {historyQuery.isLoading ? (
            <div className="space-y-2">
              {Array.from({ length: 5 }).map((_, index) => (
                <Skeleton key={index} className="h-10 w-full" />
              ))}
            </div>
          ) : (
            <div className="space-y-6">
              {historyQuery.data?.length ? (
                <MaxWeightHistoryChart records={historyQuery.data} />
              ) : null}

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Left</TableHead>
                    <TableHead>Right</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyQuery.data?.length ? (
                    historyQuery.data.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDateTime(record.recordedAt)}</TableCell>
                        <TableCell>{record.leftWeightKg != null ? `${record.leftWeightKg.toFixed(1)} kg` : "-"}</TableCell>
                        <TableCell>{record.rightWeightKg != null ? `${record.rightWeightKg.toFixed(1)} kg` : "-"}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        No max-weight records found yet.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
          )}

          {historyQuery.isError ? (
            <p className="mt-4 text-sm text-destructive">Failed to load max-weight history. Please try again.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
