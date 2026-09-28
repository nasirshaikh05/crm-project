"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  CircularProgress,
  Select,
  MenuItem,
} from "@mui/material";
import { motion } from "framer-motion";
import GroupAddOutlinedIcon from "@mui/icons-material/GroupAddOutlined";

import { useQueues } from "@/app/lib/hooks/useQueues";
import { useStages } from "@/app/lib/hooks/useStages";
import { useToast } from "@/app/components/ToastProvider";
import { leadsApi, type ApiError } from "@/app/lib/api";
import type { Lead, Queue } from "@/app/lib/api/types";

const ALLOCATE_COUNT = 5;

interface LeadAssignment {
  queueId: string | null;
  stageId: string | null;
}

interface AllocateLeadsDialogProps {
  /** Called once after at least one lead was successfully assigned, so the
   *  parent can refetch leads/stats and refresh the stage boards. */
  onAllocated: () => void;
}

const sectionTitleSx = {
  fontSize: 11,
  fontWeight: 700,
  color: "#8A8A8A",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

const selectSx = {
  fontSize: 12.5,
  "& .MuiSelect-select": { py: 0.75, px: 1.25 },
};

function LeadAssignmentRow({
  lead,
  queues,
  assignment,
  onChange,
}: {
  lead: Lead;
  queues: Queue[];
  assignment: LeadAssignment;
  onChange: (next: LeadAssignment) => void;
}) {
  const { stages, loading: stagesLoading } = useStages(assignment.queueId);

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.25,
        py: 1.25,
        borderBottom: "1px solid #F0F0F0",
      }}
    >
      <Box sx={{ flex: 1.2, minWidth: 0 }}>
        <Typography
          sx={{
            fontSize: 12.5,
            fontWeight: 700,
            color: "#1A1A1A",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {lead.firstName} {lead.lastName}
        </Typography>
        <Typography
          sx={{
            fontSize: 11,
            color: "#8A8A8A",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {lead.email}
        </Typography>
      </Box>

      <Select
        size="small"
        displayEmpty
        value={assignment.queueId ?? ""}
        onChange={(e) =>
          onChange({ queueId: e.target.value || null, stageId: null })
        }
        sx={{ ...selectSx, flex: 1 }}
      >
        <MenuItem value="">
          <em style={{ color: "#B0B0B0", fontStyle: "normal" }}>Queue</em>
        </MenuItem>
        {queues.map((queue) => (
          <MenuItem key={queue.id} value={queue.id} sx={{ fontSize: 12.5 }}>
            {queue.name}
          </MenuItem>
        ))}
      </Select>

      <Select
        size="small"
        displayEmpty
        value={assignment.stageId ?? ""}
        disabled={!assignment.queueId || stagesLoading}
        onChange={(e) =>
          onChange({ ...assignment, stageId: e.target.value || null })
        }
        sx={{ ...selectSx, flex: 1 }}
      >
        <MenuItem value="">
          <em style={{ color: "#B0B0B0", fontStyle: "normal" }}>
            {stagesLoading ? "Loading…" : "Stage"}
          </em>
        </MenuItem>
        {stages.map((stage) => (
          <MenuItem key={stage.id} value={stage.id} sx={{ fontSize: 12.5 }}>
            {stage.name}
          </MenuItem>
        ))}
      </Select>
    </Box>
  );
}

export default function AllocateLeadsDialog({
  onAllocated,
}: AllocateLeadsDialogProps) {
  const { showToast } = useToast();
  const { queues, loading: queuesLoading } = useQueues();

  const [open, setOpen] = useState(false);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [leadsLoading, setLeadsLoading] = useState(false);
  const [leadsError, setLeadsError] = useState<string | null>(null);
  const [assignments, setAssignments] = useState<
    Record<string, LeadAssignment>
  >({});
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = async () => {
    setOpen(true);
    setLeadsLoading(true);
    setLeadsError(null);
    try {
      // Backend-filtered — only leads not yet sitting in any queue/stage.
      const data = await leadsApi.getLeads({
        allocation: "unallocated",
        limit: ALLOCATE_COUNT,
      });
      setLeads(data);
      setAssignments(
        Object.fromEntries(
          data.map((lead) => [lead.id, { queueId: null, stageId: null }]),
        ),
      );
    } catch (err) {
      setLeadsError((err as ApiError).message ?? "Failed to load leads");
    } finally {
      setLeadsLoading(false);
    }
  };

  const handleClose = () => {
    if (submitting) return;
    setOpen(false);
  };

  const assignedCount = Object.values(assignments).filter(
    (a) => a.queueId && a.stageId,
  ).length;

  const handleConfirm = async () => {
    const toAssign = leads.filter(
      (lead) => assignments[lead.id]?.queueId && assignments[lead.id]?.stageId,
    );
    if (toAssign.length === 0) return;

    setSubmitting(true);
    try {
      // One batched request — the backend assigns each lead its own
      // queue/stage and fires that stage's configured action per lead.
      const allocated = await leadsApi.allocateLeads({
        allocations: toAssign.map((lead) => ({
          leadId: lead.id,
          queueId: assignments[lead.id].queueId!,
          stageId: assignments[lead.id].stageId!,
        })),
      });
      showToast(`${allocated.length} lead(s) allocated`, "success");
      onAllocated();
      setOpen(false);
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to allocate leads", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={handleOpen}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: "none",
          borderRadius: 8,
          padding: "6px 14px",
          cursor: "pointer",
          fontWeight: 400,
          fontSize: 12.5,
          fontFamily: "inherit",
          background: "#1A6FEA",
          color: "#fff",
        }}
      >
        <GroupAddOutlinedIcon sx={{ fontSize: 15 }} />
        Allocate {ALLOCATE_COUNT} leads to Queue
      </motion.button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="sm"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: "14px" } } }}
      >
        <DialogTitle sx={{ fontSize: 16, fontWeight: 800, pt: 3, px: 3, pb: 0.5 }}>
          Allocate {ALLOCATE_COUNT} leads
        </DialogTitle>
        <Typography sx={{ fontSize: 12.5, color: "#8A8A8A", px: 3, pb: 1 }}>
          Pick a queue and stage for each lead individually.
        </Typography>

        <DialogContent sx={{ px: 3, py: 2 }}>
          {leadsLoading || queuesLoading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 3 }}>
              <CircularProgress size={20} />
            </Box>
          ) : leadsError ? (
            <Typography sx={{ fontSize: 12.5, color: "#B23A3A" }}>
              Couldn&apos;t load leads — {leadsError}
            </Typography>
          ) : leads.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: "#8A8A8A" }}>
              No unallocated leads right now.
            </Typography>
          ) : queues.length === 0 ? (
            <Typography sx={{ fontSize: 12.5, color: "#8A8A8A" }}>
              No queues yet — create one first.
            </Typography>
          ) : (
            <>
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.25,
                  pb: 0.75,
                }}
              >
                <Typography sx={{ ...sectionTitleSx, flex: 1.2 }}>Lead</Typography>
                <Typography sx={{ ...sectionTitleSx, flex: 1 }}>Queue</Typography>
                <Typography sx={{ ...sectionTitleSx, flex: 1 }}>Stage</Typography>
              </Box>
              {leads.map((lead) => (
                <LeadAssignmentRow
                  key={lead.id}
                  lead={lead}
                  queues={queues}
                  assignment={assignments[lead.id] ?? { queueId: null, stageId: null }}
                  onChange={(next) =>
                    setAssignments((prev) => ({ ...prev, [lead.id]: next }))
                  }
                />
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5 }}>
          <Button
            onClick={handleClose}
            disabled={submitting}
            sx={{ textTransform: "none", fontWeight: 600, fontSize: 12.5, color: "#5A5A5A" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={assignedCount === 0 || submitting}
            variant="contained"
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: 12.5,
              boxShadow: "none",
              bgcolor: "#1A73E8",
              "&:hover": { bgcolor: "#1660C4", boxShadow: "none" },
            }}
          >
            {submitting ? (
              <CircularProgress size={16} sx={{ color: "#fff" }} />
            ) : (
              `Allocate${assignedCount > 0 ? ` (${assignedCount})` : ""}`
            )}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
