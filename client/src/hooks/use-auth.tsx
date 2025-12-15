import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "./use-toast";

export function useAuth() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const { data, isLoading } = useQuery({
    queryKey: ["/api/me"],
    queryFn: async () => {
      const res = await apiRequest('GET', '/api/me');
      return res.json();
    },
    retry: false,
  });

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const res = await apiRequest('POST', '/api/login', data);
      return res.json();
    },
    onSuccess: (data) => {
      // server returns the user object directly on login; populate the /api/me cache immediately
      try {
        queryClient.setQueryData(["/api/me"], { user: data });
      } catch (e) {
        queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      }
    },
    onError: (err: any) => {
      let message = 'Login failed';
      if (err?.message) {
        const idx = err.message.indexOf(':');
        const after = idx > -1 ? err.message.slice(idx + 1).trim() : err.message;
        try {
          const parsed = JSON.parse(after);
          message = parsed.error || JSON.stringify(parsed);
        } catch (_) {
          message = after;
        }
      }
      toast({ title: 'Login error', description: message });
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; name?: string; carModel?: string; carNumber?: string }) => {
      const res = await apiRequest('POST', '/api/register', data);
      return res.json();
    },
    onSuccess: (data) => {
      // server returns the created user object; set it in cache so the client sees the profile immediately
      try {
        queryClient.setQueryData(["/api/me"], { user: data });
      } catch (e) {
        queryClient.invalidateQueries({ queryKey: ['/api/me'] });
      }
    },
    onError: (err: any) => {
      let message = 'Registration failed';
      if (err?.message) {
        const idx = err.message.indexOf(':');
        const after = idx > -1 ? err.message.slice(idx + 1).trim() : err.message;
        try {
          const parsed = JSON.parse(after);
          message = parsed.error || JSON.stringify(parsed);
        } catch (_) {
          message = after;
        }
      }
      toast({ title: 'Registration error', description: message });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest('POST', '/api/logout');
      return res.json();
    },
    onSuccess: () => queryClient.setQueryData(["/api/me"], { user: null }),
  });

  return {
    user: data?.user ?? null,
    isLoading,
    login: loginMutation,
    register: registerMutation,
    logout: logoutMutation,
  };
}
