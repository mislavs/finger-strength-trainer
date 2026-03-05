import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { toast } from "sonner"

import { deleteSession, getSession, getSessions } from "@/features/history/api"

export const sessionQueryKeys = {
  all: ["sessions"] as const,
  detail: (id: string) => [...sessionQueryKeys.all, id] as const,
}

export function useSessions() {
  return useQuery({
    queryKey: sessionQueryKeys.all,
    queryFn: getSessions,
  })
}

export function useSession(id: string) {
  return useQuery({
    queryKey: sessionQueryKeys.detail(id),
    queryFn: () => getSession(id),
    enabled: Boolean(id),
  })
}

export function useDeleteSession() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSession,
    onSuccess: async () => {
      toast.success("Session deleted.")
      await queryClient.invalidateQueries({ queryKey: sessionQueryKeys.all })
    },
  })
}
