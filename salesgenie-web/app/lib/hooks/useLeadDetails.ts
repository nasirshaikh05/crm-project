"use client";

import { useCallback, useEffect, useState } from "react";
import { leadsApi, type ApiError } from "@/app/lib/api";
import type { LeadDetails, Queue, Stage, UpdateLeadPayload } from "@/app/lib/api/types";

export function useLeadDetails(leadId: string) {
  const [details, setDetails] = useState<LeadDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await leadsApi.getLeadDetails(leadId);
      setDetails(data);
    } catch (err) {
      setError((err as ApiError).message ?? "Failed to load lead");
    } finally {
      setLoading(false);
    }
  }, [leadId]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    refetch();
  }, [refetch]);

  const updateLead = useCallback(
    async (payload: UpdateLeadPayload) => {
      const lead = await leadsApi.updateLead(leadId, payload);
      setDetails((prev) => (prev ? { ...prev, lead } : prev));
      return lead;
    },
    [leadId],
  );

  const uploadAttachment = useCallback(
    async (file: File) => {
      const lead = await leadsApi.uploadLeadAttachment(leadId, file);
      setDetails((prev) => (prev ? { ...prev, lead } : prev));
      return lead;
    },
    [leadId],
  );

  /** Reassigning queue/stage goes through moveLead (not updateLead) so the
   *  backend resolves a default step, fires the step's auto-execute
   *  action, and logs a transition — same behavior as AssignLeadPanel.
   *  `optimistic` (the same Queue/Stage objects the caller's own dropdowns
   *  already resolved them from) is applied to `workflow` immediately, so
   *  "Current queue/stage" updates the instant this resolves rather than
   *  waiting on the trailing refetch below to land. */
  const reassign = useCallback(
    async (
      payload: { queueId?: string; stageId?: string; stepId?: string },
      optimistic?: { queue?: Queue; stage?: Stage },
    ) => {
      const lead = await leadsApi.moveLead(leadId, payload);
      setDetails((prev) =>
        prev
          ? {
              ...prev,
              lead,
              workflow: {
                ...prev.workflow,
                queue: optimistic?.queue ?? prev.workflow.queue,
                stage: optimistic?.stage ?? prev.workflow.stage,
              },
            }
          : prev,
      );
      await refetch();
      return lead;
    },
    [leadId, refetch],
  );

  return { details, loading, error, refetch, updateLead, uploadAttachment, reassign };
}
