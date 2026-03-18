import { Controller, type UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  protocolNumericFields,
  toggleFields,
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
  isSubmitting: boolean
  isEditMode: boolean
  onCancel: () => void
}

export function ProtocolFormSections({
  form,
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
        <h2 className="font-medium">Intensity</h2>
        <ProtocolNumberField
          form={form}
          field={protocolNumericFields.weightPercentage}
          description="Percent of your current max weight. The per-hand target is calculated during sessions."
        />
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
