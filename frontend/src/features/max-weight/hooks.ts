import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { createMaxWeightRecord, getCurrentMaxWeights, getMaxWeightHistory } from "@/features/max-weight/api";
import type { CreateMaxWeightRecordInput } from "@/features/max-weight/models";

export const maxWeightQueryKeys = {
  all: ["max-weights"] as const,
  current: ["max-weights", "current"] as const,
  history: ["max-weights", "history"] as const,
};

export function useCurrentMaxWeights() {
  return useQuery({
    queryKey: maxWeightQueryKeys.current,
    queryFn: getCurrentMaxWeights,
  });
}

export function useMaxWeightHistory() {
  return useQuery({
    queryKey: maxWeightQueryKeys.history,
    queryFn: getMaxWeightHistory,
  });
}

export function useCreateMaxWeightRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (data: CreateMaxWeightRecordInput) => createMaxWeightRecord(data),
    onSuccess: async () => {
      toast.success("Max weight recorded.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: maxWeightQueryKeys.current }),
        queryClient.invalidateQueries({ queryKey: maxWeightQueryKeys.history }),
      ]);
    },
  });
}
