import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { zodResolver } from "@hookform/resolvers/zod";
import { useFieldArray, useForm, useWatch } from "react-hook-form";
import { ArrowRight, GripVertical, Loader2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
  sortableKeyboardCoordinates,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { ApiClientError } from "@/lib/api-client";
import { appRoutes } from "@/lib/app-routes";
import { useRepeaterProtocols } from "@/features/repeater-protocols/hooks";
import {
  defaultWorkoutProtocolInput,
  toWorkoutProtocolInput,
} from "@/features/workout-protocols/models";
import {
  useCreateWorkoutProtocol,
  useUpdateWorkoutProtocol,
  useWorkoutProtocol,
} from "@/features/workout-protocols/hooks";
import {
  workoutProtocolSchema,
  type WorkoutProtocolFormValues,
} from "@/features/workout-protocols/schema";

const emptyItem = { repeaterProtocolId: "", repetitions: 1, restAfterSeconds: 90 };

function getFieldErrorMessage(message: unknown): string | undefined {
  return typeof message === "string" ? message : undefined;
}

interface SequenceCardContentProps {
  index: number
  form: ReturnType<typeof useForm<WorkoutProtocolFormValues>>
  repeaterProtocols: Array<{ id: string; name: string }>
  isLoading: boolean
  isSubmitting: boolean
  canRemove: boolean
  onRemove: () => void
  repetitions: number
  hasProtocolError: boolean
  hasRepError: boolean
  dragHandleListeners?: React.HTMLAttributes<HTMLButtonElement>
  dragHandleAttributes?: React.HTMLAttributes<HTMLButtonElement>
}

function SequenceCardContent({
  index,
  form,
  repeaterProtocols,
  isLoading,
  isSubmitting,
  canRemove,
  onRemove,
  repetitions,
  hasProtocolError,
  hasRepError,
  dragHandleListeners,
  dragHandleAttributes,
}: SequenceCardContentProps) {
  return (
    <>
      {canRemove ? (
        <button
          type="button"
          onClick={onRemove}
          disabled={isSubmitting}
          className="absolute -right-2 -top-2 z-10 flex size-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground opacity-0 transition-opacity group-hover:opacity-100"
        >
          <X className="size-3" />
        </button>
      ) : null}

      <div className="mb-3 flex items-start gap-1">
        <button
          type="button"
          className="mt-0.5 shrink-0 cursor-grab touch-none rounded p-0.5 text-muted-foreground/50 transition-colors hover:text-muted-foreground active:cursor-grabbing"
          {...dragHandleListeners}
          {...dragHandleAttributes}
        >
          <GripVertical className="size-3.5" />
        </button>

        <div className="min-w-0 flex-1 space-y-1">
          <select
            id={`item-protocol-${index}`}
            className="w-full truncate border-none bg-transparent p-0 text-sm font-semibold focus:outline-none focus:ring-0"
            disabled={isSubmitting || isLoading}
            {...form.register(`items.${index}.repeaterProtocolId`)}
          >
            <option value="">Select protocol</option>
            {repeaterProtocols.map((protocol) => (
              <option key={protocol.id} value={protocol.id}>
                {protocol.name}
              </option>
            ))}
          </select>

          {hasProtocolError ? (
            <p className="text-xs text-destructive">
              {getFieldErrorMessage(form.formState.errors.items?.[index]?.repeaterProtocolId?.message)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Input
          id={`item-repetitions-${index}`}
          type="number"
          min="1"
          step="1"
          disabled={isSubmitting}
          className="h-8 w-14 border-none bg-transparent p-0 text-center text-2xl font-bold tabular-nums shadow-none focus-visible:ring-0"
          {...form.register(`items.${index}.repetitions`, { valueAsNumber: true })}
        />
        <span className="text-sm text-muted-foreground">{repetitions === 1 ? "rep" : "reps"}</span>
      </div>

      {hasRepError ? (
        <p className="mt-1 text-xs text-destructive">
          {getFieldErrorMessage(form.formState.errors.items?.[index]?.repetitions?.message)}
        </p>
      ) : null}
    </>
  );
}

interface SortableCardProps {
  fieldId: string
  index: number
  form: ReturnType<typeof useForm<WorkoutProtocolFormValues>>
  repeaterProtocols: Array<{ id: string; name: string }>
  isLoading: boolean
  isSubmitting: boolean
  canRemove: boolean
  onRemove: () => void
  repetitions: number
  hasProtocolError: boolean
  hasRepError: boolean
  isDragOverlay?: boolean
}

function SortableCard({
  fieldId,
  index,
  form,
  repeaterProtocols,
  isLoading,
  isSubmitting,
  canRemove,
  onRemove,
  repetitions,
  hasProtocolError,
  hasRepError,
}: SortableCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: fieldId });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative flex w-44 flex-col rounded-xl border-2 bg-card p-4 transition-colors ${
        isDragging ? "z-10 opacity-50" : ""
      } ${hasProtocolError || hasRepError ? "border-destructive" : "border-border hover:border-primary/40"}`}
    >
      <SequenceCardContent
        index={index}
        form={form}
        repeaterProtocols={repeaterProtocols}
        isLoading={isLoading}
        isSubmitting={isSubmitting}
        canRemove={canRemove}
        onRemove={onRemove}
        repetitions={repetitions}
        hasProtocolError={hasProtocolError}
        hasRepError={hasRepError}
        dragHandleListeners={listeners}
        dragHandleAttributes={attributes}
      />
    </div>
  );
}

interface RestConnectorProps {
  form: ReturnType<typeof useForm<WorkoutProtocolFormValues>>
  prevItemIndex: number
  isSubmitting: boolean
}

function RestConnector({ form, prevItemIndex, isSubmitting }: RestConnectorProps) {
  useWatch({ control: form.control, name: `items.${prevItemIndex}.restAfterSeconds` });
  const error = getFieldErrorMessage(form.formState.errors.items?.[prevItemIndex]?.restAfterSeconds?.message);

  return (
    <div className="flex shrink-0 flex-col items-center gap-1">
      <div className="flex items-center gap-1">
        <Input
          type="number"
          min="0"
          step="1"
          disabled={isSubmitting}
          className="h-6 w-12 border-none bg-transparent p-0 text-center text-xs font-medium tabular-nums text-muted-foreground shadow-none focus-visible:ring-1"
          {...form.register(`items.${prevItemIndex}.restAfterSeconds`, { valueAsNumber: true })}
        />
        <span className="text-xs text-muted-foreground">s</span>
      </div>
      <ArrowRight className="size-5 text-muted-foreground/40" />
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

interface SequenceBuilderProps {
  form: ReturnType<typeof useForm<WorkoutProtocolFormValues>>
  itemFields: ReturnType<typeof useFieldArray<WorkoutProtocolFormValues, "items">>
  repeaterProtocols: Array<{ id: string; name: string }>
  isLoading: boolean
  isSubmitting: boolean
}

function SequenceBuilder({
  form,
  itemFields,
  repeaterProtocols,
  isLoading,
  isSubmitting,
}: SequenceBuilderProps) {
  const watchedItems = useWatch({ control: form.control, name: "items" });
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragStart(event: DragStartEvent): void {
    setActiveId(String(event.active.id));
  }

  function handleDragEnd(event: DragEndEvent): void {
    setActiveId(null);

    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }

    const oldIndex = itemFields.fields.findIndex((f) => f.id === active.id);
    const newIndex = itemFields.fields.findIndex((f) => f.id === over.id);
    if (oldIndex !== -1 && newIndex !== -1) {
      itemFields.move(oldIndex, newIndex);
    }
  }

  const activeIndex = activeId ? itemFields.fields.findIndex((f) => f.id === activeId) : -1;
  const activeItem = activeIndex >= 0 ? watchedItems?.[activeIndex] : null;

  return (
    <section className="space-y-3">
      <div>
        <h2 className="font-medium">Sequence</h2>
        <p className="text-sm text-muted-foreground">
          Build the workout order. Drag cards to reorder.
        </p>
      </div>

      {getFieldErrorMessage(form.formState.errors.items?.message) ? (
        <p className="text-sm text-destructive">{getFieldErrorMessage(form.formState.errors.items?.message)}</p>
      ) : null}

      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
      >
        <div className="flex flex-wrap items-stretch gap-3">
          <SortableContext items={itemFields.fields.map((f) => f.id)} strategy={horizontalListSortingStrategy}>
            {itemFields.fields.map((field, index) => {
              const item = watchedItems?.[index];
              const repetitions = item?.repetitions ?? 1;
              const hasProtocolError = Boolean(form.formState.errors.items?.[index]?.repeaterProtocolId);
              const hasRepError = Boolean(form.formState.errors.items?.[index]?.repetitions);

              return (
                <div key={field.id} className="flex items-center gap-3">
                  {index > 0 ? (
                    <RestConnector form={form} prevItemIndex={index - 1} isSubmitting={isSubmitting} />
                  ) : null}

                  <SortableCard
                    fieldId={field.id}
                    index={index}
                    form={form}
                    repeaterProtocols={repeaterProtocols}
                    isLoading={isLoading}
                    isSubmitting={isSubmitting}
                    canRemove={itemFields.fields.length > 1}
                    onRemove={() => itemFields.remove(index)}
                    repetitions={repetitions}
                    hasProtocolError={hasProtocolError}
                    hasRepError={hasRepError}
                  />
                </div>
              );
            })}
          </SortableContext>

          <div className="flex items-center gap-3">
            {itemFields.fields.length > 0 ? (
              <div className="flex shrink-0 items-center">
                <ArrowRight className="size-5 text-muted-foreground/40" />
              </div>
            ) : null}

            <button
              type="button"
              onClick={() => itemFields.append(emptyItem)}
              disabled={isSubmitting || isLoading}
              className="flex w-44 flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border bg-card/50 p-6 text-muted-foreground transition-colors hover:border-primary/40 hover:text-foreground disabled:opacity-50"
            >
              <Plus className="size-6" />
              <span className="text-sm font-medium">Add more</span>
            </button>
          </div>
        </div>

        <DragOverlay>
          {activeId && activeIndex >= 0 ? (
            <div className="flex w-44 flex-col rounded-xl border-2 border-primary bg-card p-4 shadow-xl">
              <div className="mb-3 flex items-start gap-1">
                <div className="mt-0.5 shrink-0 p-0.5 text-muted-foreground">
                  <GripVertical className="size-3.5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {repeaterProtocols.find((p) => p.id === activeItem?.repeaterProtocolId)?.name ?? "Select protocol"}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-2xl font-bold tabular-nums">{activeItem?.repetitions ?? 1}</span>
                <span className="text-sm text-muted-foreground">{(activeItem?.repetitions ?? 1) === 1 ? "rep" : "reps"}</span>
              </div>
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>
    </section>
  );
}

export function WorkoutProtocolFormPage() {
  const navigate = useNavigate();
  const params = useParams();
  const id = params.id ?? "";
  const isEditMode = Boolean(id);

  const workoutProtocolQuery = useWorkoutProtocol(id);
  const repeaterProtocolsQuery = useRepeaterProtocols();
  const createWorkoutProtocol = useCreateWorkoutProtocol();
  const updateWorkoutProtocol = useUpdateWorkoutProtocol();

  const form = useForm<WorkoutProtocolFormValues>({
    resolver: zodResolver(workoutProtocolSchema),
    defaultValues: {
      ...defaultWorkoutProtocolInput,
      items: [emptyItem],
    },
  });

  const itemFields = useFieldArray({
    control: form.control,
    name: "items",
  });

  useEffect(() => {
    if (!isEditMode || !workoutProtocolQuery.data) {
      return;
    }

    const nextValues = toWorkoutProtocolInput(workoutProtocolQuery.data);
    form.reset({
      ...nextValues,
      items: nextValues.items.length ? nextValues.items : [emptyItem],
    });
  }, [form, isEditMode, workoutProtocolQuery.data]);

  async function onSubmit(values: WorkoutProtocolFormValues): Promise<void> {
    try {
      if (isEditMode) {
        await updateWorkoutProtocol.mutateAsync({ id, data: values });
      } else {
        await createWorkoutProtocol.mutateAsync(values);
      }

      navigate(appRoutes.workoutProtocols);
    } catch (error) {
      if (error instanceof ApiClientError) {
        toast.error(error.message);
        return;
      }

      toast.error("Failed to save workout protocol.");
    }
  }

  const isSubmitting = createWorkoutProtocol.isPending || updateWorkoutProtocol.isPending;

  if (isEditMode && workoutProtocolQuery.isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (isEditMode && workoutProtocolQuery.isError) {
    return <p className="text-destructive">Failed to load this workout protocol.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">{isEditMode ? "Edit workout protocol" : "New workout protocol"}</h1>
        <Button asChild variant="outline">
          <Link to={appRoutes.workoutProtocols}>Back to workout protocols</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Workout protocol settings</CardTitle>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={form.handleSubmit(onSubmit)}>
            <section>
              <div className="space-y-2">
                <Label htmlFor="workout-name">Name</Label>
                <Input id="workout-name" {...form.register("name")} disabled={isSubmitting} />
                {getFieldErrorMessage(form.formState.errors.name?.message) ? (
                  <p className="text-sm text-destructive">{getFieldErrorMessage(form.formState.errors.name?.message)}</p>
                ) : null}
              </div>
            </section>

            <SequenceBuilder
              form={form}
              itemFields={itemFields}
              repeaterProtocols={repeaterProtocolsQuery.data ?? []}
              isLoading={repeaterProtocolsQuery.isLoading}
              isSubmitting={isSubmitting}
            />

            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => navigate(appRoutes.workoutProtocols)} disabled={isSubmitting}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting || repeaterProtocolsQuery.isLoading}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : null}
                {isEditMode ? "Update workout protocol" : "Create workout protocol"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
