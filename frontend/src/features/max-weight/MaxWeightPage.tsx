import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useCreateMaxWeightRecord, useCurrentMaxWeights, useMaxWeightHistory } from "@/features/max-weight/hooks";
import type { MaxWeightHand } from "@/features/max-weight/models";
import { ApiClientError } from "@/lib/api-client";
import { formatDateTime } from "@/lib/utils";

function formatWeight(value: number | null | undefined): string {
  return typeof value === "number" && Number.isFinite(value) ? `${value.toFixed(1)} kg` : "Not recorded";
}

export function MaxWeightPage() {
  const currentQuery = useCurrentMaxWeights();
  const historyQuery = useMaxWeightHistory();
  const createRecord = useCreateMaxWeightRecord();

  const [hand, setHand] = useState<MaxWeightHand>("Left");
  const [weightKg, setWeightKg] = useState("0");
  const [formError, setFormError] = useState<string | null>(null);

  const currentCards = useMemo(
    () => [
      { label: "Left Hand", value: currentQuery.data?.leftKg },
      { label: "Right Hand", value: currentQuery.data?.rightKg },
    ],
    [currentQuery.data],
  );

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>): Promise<void> {
    event.preventDefault();
    setFormError(null);

    const parsedWeightKg = Number(weightKg);
    if (!Number.isFinite(parsedWeightKg) || parsedWeightKg <= 0) {
      setFormError("Weight must be greater than 0.");
      return;
    }

    try {
      await createRecord.mutateAsync({
        hand,
        weightKg: parsedWeightKg,
      });
      setWeightKg("0");
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFormError(error.message);
        return;
      }

      setFormError("Failed to record max weight.");
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

      <div className="grid gap-4 md:grid-cols-2">
        {currentCards.map((card) => (
          <Card key={card.label}>
            <CardHeader>
              <CardTitle>{card.label}</CardTitle>
            </CardHeader>
            <CardContent>
              {currentQuery.isLoading ? (
                <Skeleton className="h-8 w-28" />
              ) : (
                <p className="text-2xl font-semibold">{formatWeight(card.value)}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Record new max weight</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="max-weight-hand">Hand</Label>
              <select
                id="max-weight-hand"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={hand}
                onChange={(event) => setHand(event.target.value as MaxWeightHand)}
                disabled={createRecord.isPending}
              >
                <option value="Left">Left</option>
                <option value="Right">Right</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="max-weight-value">Weight (kg)</Label>
              <Input
                id="max-weight-value"
                type="number"
                step="0.1"
                min="0"
                value={weightKg}
                onChange={(event) => setWeightKg(event.target.value)}
                disabled={createRecord.isPending}
              />
            </div>

            <div className="flex items-end">
              <Button type="submit" disabled={createRecord.isPending}>
                Record
              </Button>
            </div>
          </form>

          {formError ? <p className="mt-3 text-sm text-destructive">{formError}</p> : null}
        </CardContent>
      </Card>

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
          )}

          {historyQuery.isError ? (
            <p className="mt-4 text-sm text-destructive">Failed to load max-weight history. Please try again.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
