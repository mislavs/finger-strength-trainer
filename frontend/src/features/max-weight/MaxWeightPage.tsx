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
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "Not recorded";
  }

  return `${(Object.is(value, -0) ? 0 : value).toFixed(1)} kg`;
}

function toInputWeight(value: number | null | undefined): string {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return "";
  }

  return (Object.is(value, -0) ? 0 : value).toFixed(1);
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

  const currentCards = useMemo(
    () => [
      { label: "Left Hand", value: currentQuery.data?.leftKg },
      { label: "Right Hand", value: currentQuery.data?.rightKg },
    ],
    [currentQuery.data],
  );

  const activeHandPeakKg = measurement.activeHand === "Left" ? measurement.leftPeakKg : measurement.rightPeakKg;
  const measurementScaleKg = Math.max(
    10,
    measurement.currentForceKg,
    measurement.leftPeakKg,
    measurement.rightPeakKg,
    currentQuery.data?.leftKg ?? 0,
    currentQuery.data?.rightKg ?? 0,
  );
  const measurementsToSave = useMemo<CreateMaxWeightRecordInput[]>(
    () =>
      [
        measurement.leftPeakKg > 0 ? { hand: "Left", weightKg: measurement.leftPeakKg } : null,
        measurement.rightPeakKg > 0 ? { hand: "Right", weightKg: measurement.rightPeakKg } : null,
      ].filter((value): value is CreateMaxWeightRecordInput => value !== null),
    [measurement.leftPeakKg, measurement.rightPeakKg],
  );
  const hasStreamConflict = isForceStreamActive && !measurement.isStreaming;
  const isMeasurementActionDisabled = measurement.isBusy
    || (!measurement.isStreaming && (!deviceStatus.isConnected || hasStreamConflict));
  const canSaveMeasurements = measurementsToSave.length > 0
    && !measurement.isStreaming
    && !measurement.isBusy
    && !isSavingMeasurements;
  const showMeasurementLiveUi = measurement.isStreaming;
  const showMeasurementResults = measurement.isStreaming || measurementsToSave.length > 0;
  const showSaveMeasurements = !measurement.isStreaming && measurementsToSave.length > 0;

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

    const recordsToCreate: CreateMaxWeightRecordInput[] = [];
    const manualEntries = [
      { hand: "Left" as const, value: leftWeightKg },
      { hand: "Right" as const, value: rightWeightKg },
    ];

    for (const entry of manualEntries) {
      if (entry.value.trim() === "") {
        continue;
      }

      const parsedWeightKg = Number(entry.value);
      if (!Number.isFinite(parsedWeightKg) || parsedWeightKg <= 0) {
        setFormError(`${entry.hand} weight must be greater than 0.`);
        return;
      }

      recordsToCreate.push({
        hand: entry.hand,
        weightKg: parsedWeightKg,
      });
    }

    if (recordsToCreate.length === 0) {
      setFormError("Enter a weight for at least one hand.");
      return;
    }

    try {
      setIsSavingManualRecord(true);
      await Promise.all(recordsToCreate.map((record) => createMaxWeightRecord(record)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: maxWeightQueryKeys.current }),
        queryClient.invalidateQueries({ queryKey: maxWeightQueryKeys.history }),
      ]);

      setIsLeftWeightDirty(false);
      setIsRightWeightDirty(false);
      toast.success(recordsToCreate.length === 1 ? `${recordsToCreate[0].hand} hand max weight recorded.` : "Max weights recorded.");
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
    if (measurementsToSave.length === 0) {
      setMeasurementSaveError("Measure at least one hand before saving.");
      return;
    }

    setMeasurementSaveError(null);
    setIsSavingMeasurements(true);

    try {
      await Promise.all(measurementsToSave.map((record) => createMaxWeightRecord(record)));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: maxWeightQueryKeys.current }),
        queryClient.invalidateQueries({ queryKey: maxWeightQueryKeys.history }),
      ]);

      measurement.resetPeaks();
      toast.success(
        measurementsToSave.length === 1
          ? `${measurementsToSave[0].hand} hand max weight recorded from measurement.`
          : "Measured max weights recorded.",
      );
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
                  peakForceKg={activeHandPeakKg}
                  maxScaleKg={measurementScaleKg}
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
                <Button
                  type="button"
                  onClick={() => void (measurement.isStreaming ? measurement.stop() : measurement.start())}
                  disabled={isMeasurementActionDisabled}
                >
                  {measurement.isBusy
                    ? "Working..."
                    : measurement.isStreaming
                      ? "Stop Measurement"
                      : "Start Measurement"}
                </Button>

                {showSaveMeasurements ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void handleSaveMeasurements()}
                    disabled={!canSaveMeasurements}
                  >
                    {isSavingMeasurements ? "Saving..." : "Save as max weights"}
                  </Button>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Record manually</CardTitle>
            <CardDescription>
              Enter a max weight directly if you already know the value for one hand.
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
                    min="0"
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
                    min="0"
                    value={rightWeightKg}
                    onChange={(event) => {
                      setRightWeightKg(event.target.value);
                      setIsRightWeightDirty(true);
                    }}
                    disabled={isSavingManualRecord}
                  />
                </div>
              </div>

              <Button type="submit" disabled={isSavingManualRecord}>
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
                    <TableHead>Hand</TableHead>
                    <TableHead>Weight</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {historyQuery.data?.length ? (
                    historyQuery.data.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell>{formatDateTime(record.recordedAt)}</TableCell>
                        <TableCell>{record.hand}</TableCell>
                        <TableCell>{record.weightKg.toFixed(1)} kg</TableCell>
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
