import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  createProtocol,
  deleteProtocol,
  getProtocol,
  getProtocols,
  updateProtocol,
} from "@/features/protocols/api";
import type { ProtocolInput } from "@/features/protocols/models";

export const protocolQueryKeys = {
  all: ["protocols"] as const,
  detail: (id: string) => [...protocolQueryKeys.all, id] as const,
};

function useProtocolMutation<TVariables>(
  mutationFn: (variables: TVariables) => Promise<unknown>,
  successMessage: string,
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn,
    onSuccess: async () => {
      toast.success(successMessage);
      await queryClient.invalidateQueries({ queryKey: protocolQueryKeys.all });
    },
  });
}

export function useProtocols() {
  return useQuery({
    queryKey: protocolQueryKeys.all,
    queryFn: getProtocols,
  });
}

export function useProtocol(id: string) {
  return useQuery({
    queryKey: protocolQueryKeys.detail(id),
    queryFn: () => getProtocol(id),
    enabled: Boolean(id),
  });
}

export function useCreateProtocol() {
  return useProtocolMutation<ProtocolInput>(createProtocol, "Protocol created.");
}

export function useUpdateProtocol() {
  return useProtocolMutation<{ id: string; data: ProtocolInput }>(
    ({ id, data }) => updateProtocol(id, data),
    "Protocol updated.",
  );
}

export function useDeleteProtocol() {
  return useProtocolMutation<string>(deleteProtocol, "Protocol deleted.");
}
