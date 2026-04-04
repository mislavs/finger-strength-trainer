import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NumericFieldDefinition } from "@/features/repeater-protocols/repeater-protocol-form.constants";
import type { RepeaterProtocolFormValues } from "@/features/repeater-protocols/schema";
import { cn } from "@/lib/utils";

export function getRepeaterProtocolFieldErrorMessage(message: unknown): string | undefined {
  return typeof message === "string" ? message : undefined;
}

interface RepeaterProtocolFieldErrorProps {
  message?: string
  className?: string
  reserveSpace?: boolean
}

export function RepeaterProtocolFieldError({
  message,
  className,
  reserveSpace = false,
}: RepeaterProtocolFieldErrorProps) {
  if (!reserveSpace && !message) {
    return null;
  }

  return (
    <p className={cn("text-sm text-destructive", reserveSpace ? "min-h-5" : null, className)}>
      {message ?? ""}
    </p>
  );
}

interface RepeaterProtocolNumberFieldProps {
  form: UseFormReturn<RepeaterProtocolFormValues>
  field: NumericFieldDefinition
  disabled?: boolean
  className?: string
  description?: string
  label?: string
  reserveErrorSpace?: boolean
}

export function RepeaterProtocolNumberField({
  form,
  field,
  disabled = false,
  className,
  description,
  label,
  reserveErrorSpace = true,
}: RepeaterProtocolNumberFieldProps) {
  const errorMessage = getRepeaterProtocolFieldErrorMessage(form.formState.errors[field.name]?.message);

  return (
    <div className={cn("space-y-1.5", className)}>
      <Label htmlFor={field.name}>{label ?? field.label}</Label>
      <Input
        id={field.name}
        type="number"
        step={field.step}
        disabled={disabled}
        {...form.register(field.name, { valueAsNumber: true })}
      />
      {(description ?? field.description) ? (
        <p className="text-sm text-muted-foreground">{description ?? field.description}</p>
      ) : null}
      <RepeaterProtocolFieldError message={errorMessage} reserveSpace={reserveErrorSpace} />
    </div>
  );
}
