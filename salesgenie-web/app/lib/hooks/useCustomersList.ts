"use client";

import { useEffect, useState } from "react";
import { leadsApi, type ApiError } from "@/app/lib/api";
import type { Customer } from "@/app/lib/api/types";

interface UseCustomersListParams {
  search: string;
  page: number;
  pageSize: number;
}

/**
 * GET /leads/customers returns a bare array with no total count, so "is
 * there another page" is inferred by asking for one extra row (limit + 1)
 * and trimming it off — same approach as useLeadsList.
 */
export function useCustomersList({ search, page, pageSize }: UseCustomersListParams) {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [hasMore, setHasMore] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);
      try {
        const data = await leadsApi.getCustomers({
          page,
          limit: pageSize + 1,
          search: search.trim() || undefined,
        });
        if (cancelled) return;
        setHasMore(data.length > pageSize);
        setCustomers(data.slice(0, pageSize));
      } catch (err) {
        if (!cancelled) {
          setError((err as ApiError).message ?? "Failed to load customers");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();

    return () => {
      cancelled = true;
    };
  }, [search, page, pageSize, refreshKey]);

  const refetch = () => setRefreshKey((k) => k + 1);

  return { customers, hasMore, loading, error, refetch };
}
