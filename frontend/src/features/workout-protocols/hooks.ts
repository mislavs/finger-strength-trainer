import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createWorkoutProtocol,
  deleteWorkoutProtocol,
  getWorkoutProtocol,
  getWorkoutProtocols,
  updateWorkoutProtocol,
} from "@/features/workout-protocols/api";
import type { WorkoutProtocolInput } from "@/features/workout-protocols/models";

export const workoutProtocolQueryKeys = {
  all: ["workout-protocols"] as const,
  detail: (id: string) => [...workoutProtocolQueryKeys.all, id] as const,
};

function useWorkoutProtocolMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      toast.success(successMessage);
      await queryClient.invalidateQueries({ queryKey: workoutProtocolQueryKeys.all });
    },
  });
}

export function useWorkoutProtocols() {
  return useQuery({
    queryKey: workoutProtocolQueryKeys.all,
    queryFn: getWorkoutProtocols,
  });
}

export function useWorkoutProtocol(id: string) {
  return useQuery({
    queryKey: workoutProtocolQueryKeys.detail(id),
    queryFn: () => getWorkoutProtocol(id),
    enabled: Boolean(id),
  });
}

export function useCreateWorkoutProtocol() {
  return useWorkoutProtocolMutation<WorkoutProtocolInput>(
    createWorkoutProtocol,
    "Workout protocol created.",
  );
}

export function useUpdateWorkoutProtocol() {
  return useWorkoutProtocolMutation<{ id: string; data: WorkoutProtocolInput }>(
    ({ id, data }) => updateWorkoutProtocol(id, data),
    "Workout protocol updated.",
  );
}

export function useDeleteWorkoutProtocol() {
  return useWorkoutProtocolMutation<string>(
    deleteWorkoutProtocol,
    "Workout protocol deleted.",
  );
}
