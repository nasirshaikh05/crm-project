"use client";

import { useCallback, useEffect, useState } from "react";
import { queuesApi, type ApiError } from "@/app/lib/api";
import type { CreateQueuePayload, Queue } from "@/app/lib/api/types";

export function useQueues() {
  const [queues, setQueues] = useState<Queue[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await queuesApi.getQueues();
      setQueues(data);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load queues");
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

  const createQueue = useCallback(async (payload: CreateQueuePayload) => {
    const queue = await queuesApi.createQueue(payload);
    setQueues((prev) => [...prev, queue]);
    return queue;
  }, []);

  return { queues, loading, error, refetch, createQueue };
}
