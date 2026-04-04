import { useEffect } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { appRoutes } from "@/lib/app-routes";
import { ApiClientError } from "@/lib/api-client";
import {
  useCreateRepeaterProtocol,
  useRepeaterProtocol,
  useUpdateRepeaterProtocol,
} from "@/features/repeater-protocols/hooks";
import {
  defaultRepeaterProtocolInput,
  repeaterProtocolFieldNames,
  toRepeaterProtocolInput,
  type RepeaterProtocolInput,
} from "@/features/repeater-protocols/models";
import {
  repeaterProtocolSchema,
  type RepeaterProtocolFormValues,
} from "@/features/repeater-protocols/schema";
import { RepeaterProtocolFormSections } from "@/features/repeater-protocols/RepeaterProtocolFormSections";

const secondsPerMinute = 60;

export function RepeaterProtocolFormPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ?? "";
  const isEditMode = Boolean(id);

  const repeaterProtocolQuery = useRepeaterProtocol(id);
  const createRepeaterProtocol = useCreateRepeaterProtocol();
  const updateRepeaterProtocol = useUpdateRepeaterProtocol();

  const form = useForm<RepeaterProtocolFormValues>({
    resolver: zodResolver(repeaterProtocolSchema),
    defaultValues: defaultRepeaterProtocolInput,
  });

  useEffect(() => {
    if (!isEditMode || !repeaterProtocolQuery.data) {
      return;
    }

    form.reset(toRepeaterProtocolInput(repeaterProtocolQuery.data));
  }, [form, isEditMode, repeaterProtocolQuery.data]);

  async function onSubmit(values: RepeaterProtocolFormValues): Promise<void> {
    const request = {
      ...values,
      setRestSeconds: values.setRestSeconds * secondsPerMinute,
    };

    try {
      if (isEditMode) {
        await updateRepeaterProtocol.mutateAsync({ id, data: request });
      } else {
        await createRepeaterProtocol.mutateAsync(request);
      }

      navigate(appRoutes.repeaters);
    } catch (error) {
      if (!(error instanceof ApiClientError)) {
        toast.error("Failed to save repeater protocol.");
        return;
      }

      if (error.errors) {
        for (const [fieldName, messages] of Object.entries(error.errors)) {
          if (!repeaterProtocolFieldNames.includes(fieldName as keyof RepeaterProtocolInput)) {
            continue;
          }

          form.setError(fieldName as keyof RepeaterProtocolFormValues, {
            type: "server",
            message: messages[0],
          });
        }
      }

      toast.error(error.message);
    }
  }

  const isSubmitting = createRepeaterProtocol.isPending || updateRepeaterProtocol.isPending;

  if (isEditMode && repeaterProtocolQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (isEditMode && repeaterProtocolQuery.isError) {
    return <p className="text-destructive">Failed to load this repeater protocol.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isEditMode ? "Edit repeater protocol" : "New repeater protocol"}</h1>
        <Button asChild variant="outline">
          <Link to={appRoutes.repeaters}>Back to repeaters</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Repeater protocol settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <RepeaterProtocolFormSections
              form={form}
              isSubmitting={isSubmitting}
              isEditMode={isEditMode}
              onCancel={() => navigate(appRoutes.repeaters)}
            />
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
