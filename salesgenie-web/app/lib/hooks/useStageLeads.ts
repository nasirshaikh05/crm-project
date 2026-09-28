"use client";

import { useEffect, useState } from "react";
import { leadsApi, type ApiError } from "@/app/lib/api";
import type { Lead } from "@/app/lib/api/types";

interface UseStageLeadsParams {
  stageId: string;
  /** Already-debounced — the caller owns debouncing so it can also reset
   *  pagination exactly when the effective search term changes, not on
   *  every keystroke. */
  search: string;
  page: number;
  pageSize: number;
  /** Skip fetching while the stage card is collapsed. */
  enabled: boolean;
  /** Bump to force a refetch (e.g. after a lead is allocated elsewhere). */
  refreshKey?: number;
}

/**
 * GET /leads returns a bare array with no total count, so "is there another
 * page" is inferred by asking for one extra row (limit + 1) and trimming it
 * off — there's no way to know the real total without the backend returning
 * one.
 */
export function useStageLeads({
  stageId,
  search,
  page,
  pageSize,
  enabled,
  refreshKey,
}: UseStageLeadsParams) {
  const [leads, setLeads] = useState<Lead[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!enabled) return;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await leadsApi.getLeads({
          stageId,
          page,
          limit: pageSize + 1,
          search: search.trim() || undefined,
        });
        if (cancelled) return;
        setHasMore(data.length > pageSize);
        setLeads(data.slice(0, pageSize));
      } catch (err) {
        if (!cancelled) {
          setError((err as ApiError).message ?? "Failed to load leads");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [stageId, page, pageSize, search, enabled, refreshKey]);

  return { leads, hasMore, loading, error };
}
