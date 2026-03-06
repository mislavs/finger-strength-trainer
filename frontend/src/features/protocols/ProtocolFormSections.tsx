import { Controller, type UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  timingFields,
  toggleFields,
  type NumericFieldName,
  weightFields,
} from "@/features/protocols/protocol-form.constants";
import type { ProtocolFormValues } from "@/features/protocols/schema";

function getErrorMessage(message: unknown): string | undefined {
  return typeof message === "string" ? message : undefined;
}

interface FieldErrorProps {
  message: string | undefined
}

function FieldError({ message }: FieldErrorProps) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

interface NumericInputFieldProps {
  form: UseFormReturn<ProtocolFormValues>
  name: NumericFieldName
  label: string
  step: string
}

function NumericInputField({ form, name, label, step }: NumericInputFieldProps) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} type="number" step={step} {...form.register(name, { valueAsNumber: true })} />
      <FieldError message={getErrorMessage(form.formState.errors[name]?.message)} />
    </div>
  );
}

interface ProtocolFormSectionsProps {
  form: UseFormReturn<ProtocolFormValues>
  targetWeight: number
  isSubmitting: boolean
  isEditMode: boolean
  onCancel: () => void
}

export function ProtocolFormSections({
  form,
  targetWeight,
  isSubmitting,
  isEditMode,
  onCancel,
}: ProtocolFormSectionsProps) {
  return (
    <>
      <section className="space-y-3">
        <h2 className="font-medium">General</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="7/3 Repeaters 60%" {...form.register("name")} />
          <FieldError message={getErrorMessage(form.formState.errors.name?.message)} />
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-medium">Weight</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {weightFields.map((field) => (
            <NumericInputField key={field.name} form={form} name={field.name} label={field.label} step={field.step} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Target Weight: {Number.isFinite(targetWeight) ? targetWeight.toFixed(1) : "0.0"} kg</p>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-medium">Timing</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {timingFields.map((field) => (
            <NumericInputField key={field.name} form={form} name={field.name} label={field.label} step={field.step} />
          ))}
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-medium">Audio</h2>
        <div className="space-y-4">
          {toggleFields.map((field) => (
            <div key={field.name} className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor={field.name}>{field.label}</Label>
                <p className="text-sm text-muted-foreground">{field.description}</p>
              </div>
              <Controller
                control={form.control}
                name={field.name}
                render={({ field: controllerField }) => (
                  <Switch id={field.name} checked={controllerField.value} onCheckedChange={controllerField.onChange} />
                )}
              />
            </div>
          ))}
        </div>
      </section>

      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
          {isEditMode ? "Update protocol" : "Create protocol"}
        </Button>
      </div>
    </>
  );
}
