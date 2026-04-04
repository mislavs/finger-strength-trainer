import { Controller, type UseFormReturn } from "react-hook-form";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  repeaterProtocolNumericFields,
  repeaterProtocolToggleFields,
} from "@/features/repeater-protocols/repeater-protocol-form.constants";
import {
  RepeaterProtocolFieldError,
  RepeaterProtocolNumberField,
  getRepeaterProtocolFieldErrorMessage,
} from "@/features/repeater-protocols/RepeaterProtocolFieldControls";
import { RepeaterProtocolFlowFields } from "@/features/repeater-protocols/RepeaterProtocolFlowFields";
import type { RepeaterProtocolFormValues } from "@/features/repeater-protocols/schema";

interface RepeaterProtocolFormSectionsProps {
  form: UseFormReturn<RepeaterProtocolFormValues>
  isSubmitting: boolean
  isEditMode: boolean
  onCancel: () => void
}

export function RepeaterProtocolFormSections({
  form,
  isSubmitting,
  isEditMode,
  onCancel,
}: RepeaterProtocolFormSectionsProps) {
  return (
    <>
      <section className="space-y-3">
        <h2 className="font-medium">General</h2>
        <div className="space-y-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" placeholder="7/3 Repeaters 60%" {...form.register("name")} />
          <RepeaterProtocolFieldError message={getRepeaterProtocolFieldErrorMessage(form.formState.errors.name?.message)} />
        </div>
      </section>

      <Separator />

      <section className="space-y-3">
        <h2 className="font-medium">Intensity</h2>
        <RepeaterProtocolNumberField
          form={form}
          field={repeaterProtocolNumericFields.weightPercentage}
          description="Percent of your current max weight. The per-hand target is calculated during sessions."
        />
      </section>

      <Separator />

      <RepeaterProtocolFlowFields form={form} disabled={isSubmitting} />

      <Separator />

      <section className="space-y-3">
        <h2 className="font-medium">Audio</h2>
        <div className="space-y-4">
          {repeaterProtocolToggleFields.map((field) => (
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
          {isEditMode ? "Update repeater protocol" : "Create repeater protocol"}
        </Button>
      </div>
    </>
  );
}
