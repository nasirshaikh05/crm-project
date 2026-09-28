"use client";

import { useCallback, useEffect, useState } from "react";
import { stepsApi, type ApiError } from "@/app/lib/api";
import type {
  CreateButtonTransitionPayload,
  CreateStepButtonPayload,
  CreateStepPayload,
  Step,
  UpdateStepButtonPayload,
  UpdateStepPayload,
} from "@/app/lib/api/types";

/** Steps are global — not scoped to a stage or queue. */
export function useSteps() {
  const [steps, setSteps] = useState<Step[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await stepsApi.getSteps();
      setSteps(data);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load steps");
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

  const createStep = useCallback(async (payload: CreateStepPayload) => {
    const step = await stepsApi.createStep(payload);
    setSteps((prev) => [...prev, step].sort((a, b) => a.orderIndex - b.orderIndex));
    return step;
  }, []);

  const updateStep = useCallback(
    async (id: string, payload: UpdateStepPayload) => {
      const step = await stepsApi.updateStep(id, payload);
      setSteps((prev) => prev.map((s) => (s.id === id ? step : s)));
      return step;
    },
    [],
  );

  const deleteStep = useCallback(async (id: string) => {
    await stepsApi.deleteStep(id);
    setSteps((prev) => prev.filter((s) => s.id !== id));
  }, []);

  const addButtonToStep = useCallback(
    (stepId: string, payload: CreateStepButtonPayload) =>
      stepsApi.addStepButton(stepId, payload),
    [],
  );

  const updateStepButton = useCallback(
    (buttonId: string, payload: UpdateStepButtonPayload) =>
      stepsApi.updateStepButton(buttonId, payload),
    [],
  );

  const addButtonTransition = useCallback(
    (buttonId: string, payload: CreateButtonTransitionPayload) =>
      stepsApi.createButtonTransition(buttonId, payload),
    [],
  );

  return {
    steps,
    loading,
    error,
    refetch,
    createStep,
    updateStep,
    deleteStep,
    addButtonToStep,
    updateStepButton,
    addButtonTransition,
  };
}
