"use client";

import { useCallback, useEffect, useState } from "react";
import { leadsApi, type ApiError } from "@/app/lib/api";
import type { DashboardStats } from "@/app/lib/api/types";

interface UseDashboardStatsParams {
  startDate?: string;
  endDate?: string;
}

export function useDashboardStats({ startDate, endDate }: UseDashboardStatsParams = {}) {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadsApi.getDashboardStats({ startDate, endDate });
      setStats(data);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load dashboard stats");
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    // Fetching from the backend on mount (and whenever the selected date
    // range changes) — the loading/error state this sets is the point of
    // the effect, not an avoidable derived value.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  // Leads (or the workspace name/logo, changed from TopNav's settings
  // dialog) can change from other components that have no direct way to
  // reach this hook — refetching quietly whenever this tab becomes visible
  // again, or whenever a "workspace:updated" event fires, catches those
  // without needing a hard reload. No loading/error state here since this
  // runs silently in the background, not as the page's initial load.
  useEffect(() => {
    const silentRefetch = () => {
      leadsApi.getDashboardStats({ startDate, endDate }).then(setStats).catch(() => {});
    };
    const onVisible = () => {
      if (document.visibilityState === "visible") silentRefetch();
    };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("workspace:updated", silentRefetch);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("workspace:updated", silentRefetch);
    };
  }, [startDate, endDate]);

  return { stats, loading, error, refetch };
}
