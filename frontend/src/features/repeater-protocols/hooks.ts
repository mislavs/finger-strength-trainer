import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createRepeaterProtocol,
  deleteRepeaterProtocol,
  getRepeaterProtocol,
  getRepeaterProtocols,
  updateRepeaterProtocol,
} from "@/features/repeater-protocols/api";
import type { RepeaterProtocolInput } from "@/features/repeater-protocols/models";

export const repeaterProtocolQueryKeys = {
  all: ["repeater-protocols"] as const,
  detail: (id: string) => [...repeaterProtocolQueryKeys.all, id] as const,
};

function useRepeaterProtocolMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      toast.success(successMessage);
      await queryClient.invalidateQueries({ queryKey: repeaterProtocolQueryKeys.all });
    },
  });
}

export function useRepeaterProtocols() {
  return useQuery({
    queryKey: repeaterProtocolQueryKeys.all,
    queryFn: getRepeaterProtocols,
  });
}

export function useRepeaterProtocol(id: string) {
  return useQuery({
    queryKey: repeaterProtocolQueryKeys.detail(id),
    queryFn: () => getRepeaterProtocol(id),
    enabled: Boolean(id),
  });
}

export function useCreateRepeaterProtocol() {
  return useRepeaterProtocolMutation<RepeaterProtocolInput>(
    createRepeaterProtocol,
    "Repeater protocol created.",
  );
}

export function useUpdateRepeaterProtocol() {
  return useRepeaterProtocolMutation<{ id: string; data: RepeaterProtocolInput }>(
    ({ id, data }) => updateRepeaterProtocol(id, data),
    "Repeater protocol updated.",
  );
}

export function useDeleteRepeaterProtocol() {
  return useRepeaterProtocolMutation<string>(
    deleteRepeaterProtocol,
    "Repeater protocol deleted.",
  );
}
