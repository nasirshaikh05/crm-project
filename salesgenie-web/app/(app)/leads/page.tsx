"use client";

import React, { useEffect, useMemo, useState } from "react";
import {
  Box,
  Typography,
  Button,
  CircularProgress,
  TextField,
  InputAdornment,
} from "@mui/material";
import { motion } from "framer-motion";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import SearchIcon from "@mui/icons-material/Search";

import LeadsTable from "./components/LeadsTable";
import { useLeadsList } from "@/app/lib/hooks/useLeadsList";
import { useQueues } from "@/app/lib/hooks/useQueues";
import {
  leadsApi,
  stagesApi,
  type ApiError,
  type Lead,
  type Stage,
} from "@/app/lib/api";
import { useToast } from "@/app/components/ToastProvider";
import type { LeadRecord } from "./type";

const PAGE_SIZE_OPTIONS = [50, 100, 200];
const DEFAULT_PAGE_SIZE = PAGE_SIZE_OPTIONS[0];

const MotionButton = motion.create(Button);

const AVATAR_PALETTE = [
  "#8AB4F8",
  "#57BB8A",
  "#B79CED",
  "#F0A860",
  "#E88A9A",
  "#5FB8B0",
  "#E0A9E8",
];

function colorForId(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++)
    hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_PALETTE[hash % AVATAR_PALETTE.length];
}

function toLeadRecord(
  lead: Lead,
  queueNameById: Map<string, string>,
  stageNameById: Map<string, string>,
): LeadRecord {
  const stageName = lead.currentStageId
    ? stageNameById.get(lead.currentStageId)
    : undefined;
  return {
    id: lead.id,
    firstName: lead.firstName,
    lastName: lead.lastName,
    email: lead.email,
    phone: lead.phoneNumber,
    suburb: lead.suburb ?? null,
    state: lead.state ?? null,
    postcode: lead.postcode ?? null,
    avatarColor: colorForId(lead.id),
    stagePhase: stageName
      ? { label: stageName, kind: "active" }
      : { label: "Unassigned", kind: "unassigned" },
    queue: lead.currentQueueId
      ? (queueNameById.get(lead.currentQueueId) ?? null)
      : null,
    queueId: lead.currentQueueId ?? null,
    stageId: lead.currentStageId ?? null,
  };
}

export default function LeadsPage() {
  const { showToast } = useToast();

  // `search` updates on every keystroke so the box feels responsive;
  // `debouncedSearch` is what actually drives fetching + pagination reset.
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 350);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPage(1);
  }, [debouncedSearch]);

  const {
    leads,
    hasMore,
    loading: leadsLoading,
    error: leadsError,
    refetch: refetchLeads,
  } = useLeadsList({ search: debouncedSearch, page, pageSize });

  const { queues } = useQueues();
  const [stages, setStages] = useState<Stage[]>([]);

  useEffect(() => {
    stagesApi
      .getStages()
      .then(setStages)
      .catch(() => {
        // Stage names are a display nicety — leads still render without them.
      });
  }, []);

  useEffect(() => {
    if (leadsError) showToast(leadsError, "error");
  }, [leadsError, showToast]);

  const queueNameById = useMemo(
    () => new Map(queues.map((q) => [q.id, q.name])),
    [queues],
  );
  const stageNameById = useMemo(
    () => new Map(stages.map((s) => [s.id, s.name])),
    [stages],
  );

  const records: LeadRecord[] = useMemo(
    () => leads.map((lead) => toLeadRecord(lead, queueNameById, stageNameById)),
    [leads, queueNameById, stageNameById],
  );

  const handleAssign = async (
    leadId: string,
    queueId: string,
    stageId: string,
  ) => {
    try {
      await leadsApi.moveLead(leadId, { queueId, stageId });
      showToast("Lead assigned", "success");
      await refetchLeads();
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to assign lead", "error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ maxWidth: 1440, mx: "auto" }}>
        {/* Header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 2.5,
          }}
        >
          <Box>
            <Typography
              sx={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A" }}
            >
              Leads
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "#8A8A8A" }}>
              Eziyo / Leads Management
            </Typography>
          </Box>
        </Box>

        {/* Filters row */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderBottom: "1px solid #EEE",
            pb: 1.25,
            mb: 2,
          }}
        >
          <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
            All Leads ({records.length}
            {hasMore ? "+" : ""})
          </Typography>

          <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
            <TextField
              size="small"
              placeholder="Search leads..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              slotProps={{
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchIcon sx={{ fontSize: 16, color: "#B0B0B0" }} />
                    </InputAdornment>
                  ),
                },
              }}
              sx={{
                width: 220,
                "& .MuiOutlinedInput-root": {
                  borderRadius: "8px",
                  fontSize: 12.5,
                },
              }}
            />
          </Box>
        </Box>

        {leadsLoading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <LeadsTable
            leads={records}
            hasMore={hasMore}
            page={page}
            pageSize={pageSize}
            pageSizeOptions={PAGE_SIZE_OPTIONS}
            onPageChange={setPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setPage(1);
            }}
            onAssign={handleAssign}
          />
        )}
      </Box>
    </motion.div>
  );
}
