"use client";

import { useCallback, useEffect, useState } from "react";
import { leadsApi, type ApiError } from "@/app/lib/api";
import type { CreateLeadPayload, Lead } from "@/app/lib/api/types";

export function useLeads() {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadsApi.getLeads();
      setLeads(data);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load leads");
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

  const createLead = useCallback(async (payload: CreateLeadPayload) => {
    const lead = await leadsApi.createLead(payload);
    setLeads((prev) => [...prev, lead]);
    return lead;
  }, []);

  return { leads, loading, error, refetch, createLead };
}
