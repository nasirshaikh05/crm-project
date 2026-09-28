"use client";

import { useCallback, useEffect, useState } from "react";
import * as formsStore from "@/app/lib/forms/formsStore";
import type {
  CreateFormPayload,
  FormDefinition,
  UpdateFormPayload,
} from "@/app/lib/forms/types";

export function useForms() {
  const [forms, setForms] = useState<FormDefinition[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await formsStore.getForms();
      setForms(data);
    } catch {
      setError("Failed to load forms");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  const createForm = useCallback(async (payload: CreateFormPayload) => {
    const form = await formsStore.createForm(payload);
    setForms((prev) => [form, ...prev]);
    return form;
  }, []);

  const updateForm = useCallback(
    async (id: string, payload: UpdateFormPayload) => {
      const form = await formsStore.updateForm(id, payload);
      setForms((prev) => prev.map((f) => (f.id === id ? form : f)));
      return form;
    },
    [],
  );

  const deleteForm = useCallback(async (id: string) => {
    await formsStore.deleteForm(id);
    setForms((prev) => prev.filter((f) => f.id !== id));
  }, []);

  return { forms, loading, error, refetch, createForm, updateForm, deleteForm };
}
