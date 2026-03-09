import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  protocolNumericFields,
  type NumericFieldDefinition,
} from "@/features/protocols/protocol-form.constants";
import {
  ProtocolFieldError,
  ProtocolNumberField,
  getProtocolFieldErrorMessage,
} from "@/features/protocols/ProtocolFieldControls";
import type { ProtocolFormValues } from "@/features/protocols/schema";
import { cn } from "@/lib/utils";

const outerFlowLayoutClassName = "grid gap-3 xl:grid-cols-[minmax(12rem,14rem)_auto_minmax(0,1fr)] xl:items-stretch";
const setStagesLayoutClassName = "grid min-w-0 gap-3 xl:grid-cols-[minmax(12rem,1.45fr)_auto_minmax(9rem,1fr)_auto_minmax(9rem,1fr)]";

function toFiniteNumber(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function formatSeconds(value: number): string {
  const rounded = Math.round(value * 10) / 10;

  if (Number.isInteger(rounded)) {
    return `${rounded.toFixed(0)}s`;
  }

  return `${rounded.toFixed(1)}s`;
}

interface StageCardProps {
  children: ReactNode
  className?: string
}

function StageCard({ children, className }: StageCardProps) {
  return (
    <div className={cn("min-w-0 rounded-2xl border bg-card p-4 shadow-sm", className)}>
      <div className="space-y-3">{children}</div>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="hidden items-center justify-center xl:flex">
      <div className="flex items-center gap-1 text-muted-foreground">
        <div className="h-px w-4 bg-border" />
        <ArrowRight className="size-4" />
        <div className="h-px w-4 bg-border" />
      </div>
    </div>
  );
}

interface SetHeaderProps {
  form: UseFormReturn<ProtocolFormValues>
  disabled?: boolean
}

function SetHeader({ form, disabled = false }: SetHeaderProps) {
  const numberOfSetsField = protocolNumericFields.numberOfSets;
  const setsErrorMessage = getProtocolFieldErrorMessage(form.formState.errors.numberOfSets?.message);

  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-center gap-2">
        <h3 className="font-medium">Set</h3>
        <span className="text-sm text-muted-foreground">x</span>
        <div className="w-24">
          <Label htmlFor={numberOfSetsField.name} className="sr-only">
            {numberOfSetsField.label}
          </Label>
          <Input
            id={numberOfSetsField.name}
            type="number"
            step={numberOfSetsField.step}
            disabled={disabled}
            {...form.register(numberOfSetsField.name, { valueAsNumber: true })}
          />
        </div>
      </div>

      <ProtocolFieldError message={setsErrorMessage} />
    </div>
  );
}

interface SingleStageFieldProps {
  form: UseFormReturn<ProtocolFormValues>
  field: NumericFieldDefinition
  disabled?: boolean
}

function SingleStageField({ form, field, disabled = false }: SingleStageFieldProps) {
  return (
    <StageCard className="flex h-full items-center">
      <ProtocolNumberField form={form} field={field} disabled={disabled} />
    </StageCard>
  );
}

interface SummaryCardProps {
  label: string
  value: string
  detail: string
}

function SummaryCard({ label, value, detail }: SummaryCardProps) {
  return (
    <div className="rounded-xl border bg-muted/20 p-4">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
      <p className="mt-2 text-sm text-muted-foreground">{detail}</p>
    </div>
  );
}

interface ProtocolFlowFieldsProps {
  form: UseFormReturn<ProtocolFormValues>
  disabled?: boolean
}

export function ProtocolFlowFields({ form, disabled = false }: ProtocolFlowFieldsProps) {
  const [
    repsPerSet,
    numberOfSets,
    workSeconds,
    restSeconds,
    handSwitchSeconds,
  ] = useWatch({
    control: form.control,
    name: [
      "repsPerSet",
      "numberOfSets",
      "workSeconds",
      "restSeconds",
      "handSwitchSeconds",
    ],
  });

  const safeRepsPerSet = toFiniteNumber(repsPerSet);
  const safeNumberOfSets = toFiniteNumber(numberOfSets);
  const safeWorkSeconds = toFiniteNumber(workSeconds);
  const safeRestSeconds = toFiniteNumber(restSeconds);
  const safeHandSwitchSeconds = toFiniteNumber(handSwitchSeconds);

  const oneHandSeconds = (safeRepsPerSet * safeWorkSeconds) + (Math.max(safeRepsPerSet - 1, 0) * safeRestSeconds);
  const twoHandSeconds = (oneHandSeconds * 2) + safeHandSwitchSeconds;
  const totalWorkReps = safeNumberOfSets * safeRepsPerSet * 2;
  const summaryCards = [
    {
      label: "Time on one hand",
      value: formatSeconds(oneHandSeconds),
      detail: `${safeRepsPerSet} reps with rest only between reps`,
    },
    {
      label: "Left + right before set rest",
      value: formatSeconds(twoHandSeconds),
      detail: `${formatSeconds(safeHandSwitchSeconds)} hand switch included`,
    },
    {
      label: "Total work reps",
      value: totalWorkReps.toString(),
      detail: `${safeNumberOfSets} sets x ${safeRepsPerSet} reps x 2 hands`,
    },
  ];

  return (
    <section className="space-y-4">
      <div className={outerFlowLayoutClassName}>
        <SingleStageField form={form} field={protocolNumericFields.countdownSeconds} disabled={disabled} />

        <FlowConnector />

        <div className="min-w-0 space-y-4 xl:col-start-3">
          <div className="min-w-0 rounded-2xl border bg-card p-4 shadow-sm">
            <div className="space-y-4">
              <SetHeader form={form} disabled={disabled} />

              <div className={setStagesLayoutClassName}>
                <StageCard>
                  <div className="grid grid-cols-2 gap-3">
                    <ProtocolNumberField form={form} field={protocolNumericFields.workSeconds} disabled={disabled} />
                    <ProtocolNumberField form={form} field={protocolNumericFields.restSeconds} disabled={disabled} />
                  </div>

                  <ProtocolNumberField form={form} field={protocolNumericFields.repsPerSet} disabled={disabled} className="mb-0" />
                </StageCard>

                <FlowConnector />

                <SingleStageField form={form} field={protocolNumericFields.handSwitchSeconds} disabled={disabled} />

                <FlowConnector />

                <SingleStageField form={form} field={protocolNumericFields.setRestSeconds} disabled={disabled} />
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {summaryCards.map((card) => (
          <SummaryCard key={card.label} label={card.label} value={card.value} detail={card.detail} />
        ))}
      </div>
    </section>
  );
}
