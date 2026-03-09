import type { UseFormReturn } from "react-hook-form";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { NumericFieldDefinition } from "@/features/protocols/protocol-form.constants";
import type { ProtocolFormValues } from "@/features/protocols/schema";
import { cn } from "@/lib/utils";

export function getProtocolFieldErrorMessage(message: unknown): string | undefined {
  return typeof message === "string" ? message : undefined;
}

interface ProtocolFieldErrorProps {
  message?: string
  className?: string
  reserveSpace?: boolean
}

export function ProtocolFieldError({
  message,
  className,
  reserveSpace = false,
}: ProtocolFieldErrorProps) {
  if (!reserveSpace && !message) {
    return null;
  }

  return (
    <p className={cn("text-sm text-destructive", reserveSpace ? "min-h-5" : null, className)}>
      {message ?? ""}
    </p>
  );
}

interface ProtocolNumberFieldProps {
  form: UseFormReturn<ProtocolFormValues>
  field: NumericFieldDefinition
  disabled?: boolean
  className?: string
  description?: string
  label?: string
  reserveErrorSpace?: boolean
}

export function ProtocolNumberField({
  form,
  field,
  disabled = false,
  className,
  description,
  label,
  reserveErrorSpace = true,
}: ProtocolNumberFieldProps) {
  const errorMessage = getProtocolFieldErrorMessage(form.formState.errors[field.name]?.message);

  return (
    <div className={cn("space-y-2", className)}>
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
      <ProtocolFieldError message={errorMessage} reserveSpace={reserveErrorSpace} />
    </div>
  );
}
