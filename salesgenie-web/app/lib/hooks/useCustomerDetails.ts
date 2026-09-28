"use client";

import { useCallback, useEffect, useState } from "react";
import { leadsApi, type ApiError, type Customer } from "@/app/lib/api";
import type { UpdateCustomerPayload } from "@/app/lib/api/types";

export function useCustomerDetails(customerId: string) {
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadsApi.getCustomerDetails(customerId);
      setCustomer(data);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load customer");
    } finally {
      setLoading(false);
    }
  }, [customerId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  const updateCustomer = useCallback(
    async (payload: UpdateCustomerPayload) => {
      const updated = await leadsApi.updateCustomer(customerId, payload);
      setCustomer(updated);
      return updated;
    },
    [customerId],
  );

  return { customer, loading, error, refetch, updateCustomer };
}
