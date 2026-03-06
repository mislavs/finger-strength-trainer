import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm, useWatch } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { appRoutes } from "@/lib/app-routes";
import { ApiClientError } from "@/lib/api-client";
import { useCreateProtocol, useProtocol, useUpdateProtocol } from "@/features/protocols/hooks";
import { defaultProtocolInput, protocolFieldNames, toProtocolInput, type ProtocolInput } from "@/features/protocols/models";
import { protocolSchema, type ProtocolFormValues } from "@/features/protocols/schema";
import { ProtocolFormSections } from "@/features/protocols/ProtocolFormSections";

export function ProtocolFormPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ?? "";
  const isEditMode = Boolean(id);

  const protocolQuery = useProtocol(id);
  const createProtocol = useCreateProtocol();
  const updateProtocol = useUpdateProtocol();

  const form = useForm<ProtocolFormValues>({
    resolver: zodResolver(protocolSchema),
    defaultValues: defaultProtocolInput,
  });

  useEffect(() => {
    if (!isEditMode || !protocolQuery.data) {
      return;
    }

    form.reset(toProtocolInput(protocolQuery.data));
  }, [form, isEditMode, protocolQuery.data]);

  async function onSubmit(values: ProtocolFormValues): Promise<void> {
    try {
      if (isEditMode) {
        await updateProtocol.mutateAsync({ id, data: values });
      } else {
        await createProtocol.mutateAsync(values);
      }

      navigate(appRoutes.protocols);
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        toast.error("Failed to save protocol.");
        return;
      }

      if (error.errors) {
        for (const [fieldName, messages] of Object.entries(error.errors)) {
          if (!protocolFieldNames.includes(fieldName as keyof ProtocolInput)) {
            continue;
          }

          form.setError(fieldName as keyof ProtocolFormValues, {
            type: "server",
            message: messages[0],
          });
        }
      }

      toast.error(error.message);
    }
  }

  const maxWeightKg = useWatch({ control: form.control, name: "maxWeightKg" });
  const weightPercentage = useWatch({ control: form.control, name: "weightPercentage" });
  const targetWeight = (maxWeightKg * weightPercentage) / 100;
  const isSubmitting = createProtocol.isPending || updateProtocol.isPending;

  if (isEditMode && protocolQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isEditMode && protocolQuery.isError) {
    return <p className="text-destructive">Failed to load this protocol.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isEditMode ? "Edit protocol" : "New protocol"}</h1>
        <Button asChild variant="outline">
          <Link to={appRoutes.protocols}>Back to list</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Protocol settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <ProtocolFormSections
              form={form}
              targetWeight={targetWeight}
              isSubmitting={isSubmitting}
              isEditMode={isEditMode}
              onCancel={() => navigate(appRoutes.protocols)}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
