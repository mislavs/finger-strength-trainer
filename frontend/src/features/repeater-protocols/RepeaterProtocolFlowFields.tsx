import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";
import { useWatch, type UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { repeaterProtocolNumericFields } from "@/features/repeater-protocols/repeater-protocol-form.constants";
import {
  RepeaterProtocolFieldError,
  RepeaterProtocolNumberField,
  getRepeaterProtocolFieldErrorMessage,
} from "@/features/repeater-protocols/RepeaterProtocolFieldControls";
import type { RepeaterProtocolFormValues } from "@/features/repeater-protocols/schema";
import { cn } from "@/lib/utils";

const flowGridClassName = [
  "grid gap-2",
  "xl:grid-cols-[minmax(10rem,1fr)_auto_minmax(0,2.5fr)_auto_minmax(10rem,1fr)_auto_minmax(10rem,1fr)]",
  "xl:items-stretch",
].join(" ");

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
  step: number
  label: string
  children: ReactNode
  className?: string
}

function StageCard({ step, label, children, className }: StageCardProps) {
  return (
    <div className={cn("flex min-w-0 flex-col rounded-xl border bg-card p-4", className)}>
      <div className="mb-3 flex items-center gap-2">
        <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium text-muted-foreground">
          {step}
        </span>
        <span className="text-sm font-medium text-muted-foreground">{label}</span>
      </div>
      <div className="flex flex-1 flex-col justify-center gap-3">{children}</div>
    </div>
  );
}

function FlowConnector() {
  return (
    <div className="flex items-center justify-center">
      <ChevronRight className="hidden size-4 text-muted-foreground/40 xl:block" />
      <div className="h-3 w-px bg-border xl:hidden" />
    </div>
  );
}

interface SetCountFieldProps {
  form: UseFormReturn<RepeaterProtocolFormValues>
  disabled?: boolean
}

function SetCountField({ form, disabled = false }: SetCountFieldProps) {
  const field = repeaterProtocolNumericFields.numberOfSets;
  const errorMessage = getRepeaterProtocolFieldErrorMessage(form.formState.errors.numberOfSets?.message);

  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="w-16">
          <Label htmlFor={field.name} className="sr-only">
            {field.label}
          </Label>
          <Input
            id={field.name}
            type="number"
            step={field.step}
            disabled={disabled}
            {...form.register(field.name, { valueAsNumber: true })}
          />
        </div>
        <span className="text-sm text-muted-foreground">sets</span>
      </div>
      <RepeaterProtocolFieldError message={errorMessage} />
    </div>
  );
}

interface SummaryStatProps {
  label: string
  value: string
  detail: string
}

function SummaryStat({ label, value, detail }: SummaryStatProps) {
  return (
    <div className="rounded-lg bg-muted/40 px-4 py-3">
      <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
      <p className="mt-1 text-2xl font-bold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{detail}</p>
    </div>
  );
}

interface RepeaterProtocolFlowFieldsProps {
  form: UseFormReturn<RepeaterProtocolFormValues>
  disabled?: boolean
}

export function RepeaterProtocolFlowFields({ form, disabled = false }: RepeaterProtocolFlowFieldsProps) {
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

  const stats = [
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
      detail: `${safeNumberOfSets} sets × ${safeRepsPerSet} reps × 2 hands`,
    },
  ];

  return (
    <section className="space-y-4">
      <div className={flowGridClassName}>
        <StageCard step={1} label="Prep">
          <RepeaterProtocolNumberField form={form} field={repeaterProtocolNumericFields.countdownSeconds} disabled={disabled} />
        </StageCard>

        <FlowConnector />

        <StageCard step={2} label="Work">
          <SetCountField form={form} disabled={disabled} />

          <div className="grid grid-cols-2 gap-3">
            <RepeaterProtocolNumberField form={form} field={repeaterProtocolNumericFields.workSeconds} disabled={disabled} label="Work (s)" />
            <RepeaterProtocolNumberField form={form} field={repeaterProtocolNumericFields.restSeconds} disabled={disabled} label="Rest (s)" />
          </div>

          <RepeaterProtocolNumberField form={form} field={repeaterProtocolNumericFields.repsPerSet} disabled={disabled} />
        </StageCard>

        <FlowConnector />

        <StageCard step={3} label="Switch">
          <RepeaterProtocolNumberField form={form} field={repeaterProtocolNumericFields.handSwitchSeconds} disabled={disabled} />
        </StageCard>

        <FlowConnector />

        <StageCard step={4} label="Rest">
          <RepeaterProtocolNumberField form={form} field={repeaterProtocolNumericFields.setRestSeconds} disabled={disabled} />
        </StageCard>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        {stats.map((stat) => (
          <SummaryStat key={stat.label} label={stat.label} value={stat.value} detail={stat.detail} />
        ))}
      </div>
    </section>
  );
}
