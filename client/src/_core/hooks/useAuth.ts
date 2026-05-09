
import { trpc } from "@/lib/trpc";
import { TRPCClientError } from "@trpc/client";
import { useCallback, useMemo } from "react";
 
type UseAuthOptions = {
  redirectOnUnauthenticated?: boolean;
  redirectPath?: string;
};
 
export function useAuth(_options?: UseAuthOptions) {
  const utils = trpc.useUtils();
  const meQuery = trpc.auth.me.useQuery(undefined, {
    retry: false,
    refetchOnWindowFocus: false,
  });
  const logoutMutation = trpc.auth.logout.useMutation({
    onSuccess: () => {
      utils.auth.me.setData(undefined, null);
    },
  });
 
  const logout = useCallback(async () => {
    try {
      await logoutMutation.mutateAsync();
    } catch (error: unknown) {
      if (
        error instanceof TRPCClientError &&
        error.data?.code === "UNAUTHORIZED"
      ) {
        return;
      }
      throw error;
    } finally {
      utils.auth.me.setData(undefined, null);
      await utils.auth.me.invalidate();
    }
  }, [logoutMutation, utils]);
 
  const state = useMemo(() => {
    // Mock user para bypass de autenticação local
    const mockUser = {
      id: 1,
      email: "admin@local.com",
      name: "Admin Local",
      role: "admin",
    };
    return {
      user: meQuery.data ?? mockUser,
      loading: false,
      error: null,
      isAuthenticated: true,
    };
  }, [meQuery.data]);
 
  // Redirecionamento desabilitado em modo local
  return {
    ...state,
    refresh: () => meQuery.refetch(),
    logout,
  };
}
