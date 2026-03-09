import { Controller, type UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  toggleFields,
  weightFields,
} from "@/features/protocols/protocol-form.constants";
import {
  ProtocolFieldError,
  ProtocolNumberField,
  getProtocolFieldErrorMessage,
} from "@/features/protocols/ProtocolFieldControls";
import { ProtocolFlowFields } from "@/features/protocols/ProtocolFlowFields";
import type { ProtocolFormValues } from "@/features/protocols/schema";

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
          <ProtocolFieldError message={getProtocolFieldErrorMessage(form.formState.errors.name?.message)} />
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-medium">Load</h2>
        <div className="grid gap-4 md:grid-cols-2">
          {weightFields.map((field) => (
            <ProtocolNumberField key={field.name} form={form} field={field} />
          ))}
        </div>
        <p className="text-sm text-muted-foreground">Target Weight: {Number.isFinite(targetWeight) ? targetWeight.toFixed(1) : "0.0"} kg</p>
      </section>

      <Separator />

      <ProtocolFlowFields form={form} disabled={isSubmitting} />

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
