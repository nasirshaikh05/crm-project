"use client";

import { useCallback, useEffect, useState } from "react";
import { stagesApi, type ApiError } from "@/app/lib/api";
import type { CreateStagePayload, Stage } from "@/app/lib/api/types";

export function useStages(queueId: string | null) {
  const [stages, setStages] = useState<Stage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!queueId) {
      setStages([]);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await stagesApi.getStagesByQueue(queueId);
      setStages(data);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load stages");
    } finally {
      setLoading(false);
    }
  }, [queueId]);

  useEffect(() => {
    // Fetching from the backend whenever queueId changes — the loading/error
    // state this sets is the point of the effect, not an avoidable derived value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  const createStage = useCallback(async (payload: CreateStagePayload) => {
    const stage = await stagesApi.createStage(payload);
    setStages((prev) => [...prev, stage]);
    return stage;
  }, []);

  return { stages, loading, error, refetch, createStage };
}
