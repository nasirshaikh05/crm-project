"use client";

import { useCallback, useEffect, useState } from "react";
import { workspacesApi, type ApiError } from "@/app/lib/api";
import type {
  CreateWorkspacePayload,
  UpdateWorkspacePayload,
  Workspace,
} from "@/app/lib/api/types";

export function useWorkspaces() {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await workspacesApi.getWorkspaces();
      setWorkspaces(data);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load workspaces");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // Fetching from the backend on mount — the loading/error state this sets
    // is the point of the effect, not an avoidable derived value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  const createWorkspace = useCallback(async (payload: CreateWorkspacePayload) => {
    const workspace = await workspacesApi.createWorkspace(payload);
    setWorkspaces((prev) => [...prev, workspace]);
    return workspace;
  }, []);

  const updateWorkspace = useCallback(
    async (id: string, payload: UpdateWorkspacePayload) => {
      const workspace = await workspacesApi.updateWorkspace(id, payload);
      setWorkspaces((prev) => prev.map((w) => (w.id === id ? workspace : w)));
      return workspace;
    },
    [],
  );

  const uploadLogo = useCallback(async (id: string, file: File) => {
    const workspace = await workspacesApi.uploadLogo(id, file);
    setWorkspaces((prev) => prev.map((w) => (w.id === id ? workspace : w)));
    return workspace;
  }, []);

  return {
    workspaces,
    loading,
    error,
    refetch,
    createWorkspace,
    updateWorkspace,
    uploadLogo,
  };
}
