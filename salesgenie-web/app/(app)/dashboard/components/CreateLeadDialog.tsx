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
  TextField,
  MenuItem,
  Divider,
  CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import PersonAddAltOutlinedIcon from "@mui/icons-material/PersonAddAltOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";

import { useQueues } from "@/app/lib/hooks/useQueues";
import { useStages } from "@/app/lib/hooks/useStages";
import { useSteps } from "@/app/lib/hooks/useSteps";
import type { ApiError } from "@/app/lib/api";
import type { CreateLeadPayload, Lead } from "@/app/lib/api/types";
import { useToast } from "@/app/components/ToastProvider";

interface CreateLeadDialogProps {
  createLead: (payload: CreateLeadPayload) => Promise<Lead>;
}

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "10px",
    fontSize: 13.5,
  },
};

const labelSx = {
  fontSize: 12,
  fontWeight: 700,
  color: "#5A5A5A",
  mb: 0.75,
};

const sectionTitleSx = {
  fontSize: 11,
  fontWeight: 700,
  color: "#8A8A8A",
  textTransform: "uppercase" as const,
  letterSpacing: "0.04em",
};

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box>
      <Typography sx={labelSx}>{label}</Typography>
      {children}
    </Box>
  );
}

export default function CreateLeadDialog({ createLead }: CreateLeadDialogProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [queueId, setQueueId] = useState("");
  const [stageId, setStageId] = useState("");

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const { queues, loading: queuesLoading } = useQueues();
  const { stages, loading: stagesLoading } = useStages(queueId || null);
  const { steps, loading: stepsLoading } = useSteps();

  // Steps are global now, not per-stage — this just reflects whether any
  // step exists at all in the system yet.
  const noStepsConfigured =
    Boolean(stageId) && !stepsLoading && steps.length === 0;

  const canSubmit = Boolean(
    firstName.trim() &&
      lastName.trim() &&
      email.trim() &&
      phoneNumber.trim() &&
      queueId &&
      stageId,
  );

  const resetForm = () => {
    setFirstName("");
    setLastName("");
    setEmail("");
    setPhoneNumber("");
    setSuburb("");
    setState("");
    setPostcode("");
    setQueueId("");
    setStageId("");
    setSaveError(null);
  };

  const handleClose = () => {
    setOpen(false);
    resetForm();
  };

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    setSaveError(null);
    try {
      const lead = await createLead({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        suburb: suburb.trim() || undefined,
        state: state.trim() || undefined,
        postcode: postcode.trim() || undefined,
        currentQueueId: queueId,
        currentStageId: stageId,
      });
      handleClose();
      showToast(`Lead "${lead.firstName} ${lead.lastName}" created`, "success");
    } catch (err) {
      const message = (err as ApiError).message ?? "Failed to create lead";
      setSaveError(message);
      showToast(message, "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setOpen(true)}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.96 }}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          border: "1px solid #1A6FEA",
          borderRadius: 8,
          padding: "6px 14px",
          cursor: "pointer",
          fontWeight: 400,
          fontSize: 12.5,
          fontFamily: "inherit",
          background: "#fff",
          color: "#1A6FEA",
        }}
      >
        <PersonAddAltOutlinedIcon sx={{ fontSize: 15 }} />
        Create Lead
      </motion.button>

      <Dialog
        open={open}
        onClose={handleClose}
        maxWidth="xs"
        fullWidth
        slotProps={{ paper: { sx: { borderRadius: "14px" } } }}
      >
        <DialogTitle sx={{ fontSize: 16, fontWeight: 800, pt: 3, px: 3, pb: 0.5 }}>
          Create new lead
        </DialogTitle>
        <Typography sx={{ fontSize: 12.5, color: "#8A8A8A", px: 3, pb: 1 }}>
          Add a contact and place them directly into a pipeline stage.
        </Typography>

        <DialogContent sx={{ px: 3, py: 2 }}>
          <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <Typography sx={sectionTitleSx}>Contact details</Typography>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Field label="First name">
                <TextField
                  fullWidth
                  placeholder="Jane"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  size="small"
                  sx={fieldSx}
                />
              </Field>
              <Field label="Last name">
                <TextField
                  fullWidth
                  placeholder="Doe"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  size="small"
                  sx={fieldSx}
                />
              </Field>
            </Box>

            <Field label="Email">
              <TextField
                fullWidth
                type="email"
                placeholder="jane.doe@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                size="small"
                sx={fieldSx}
              />
            </Field>

            <Field label="Phone number">
              <TextField
                fullWidth
                placeholder="+1 555 123 4567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                size="small"
                sx={fieldSx}
              />
            </Field>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Field label="Suburb">
                <TextField
                  fullWidth
                  placeholder="Surry Hills"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  size="small"
                  sx={fieldSx}
                />
              </Field>
              <Field label="State">
                <TextField
                  fullWidth
                  placeholder="NSW"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  size="small"
                  sx={fieldSx}
                />
              </Field>
              <Field label="Postcode">
                <TextField
                  fullWidth
                  placeholder="2010"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  size="small"
                  sx={fieldSx}
                />
              </Field>
            </Box>

            <Divider sx={{ my: 0.5 }} />

            <Typography sx={sectionTitleSx}>Pipeline placement</Typography>

            <Field label="Queue">
              <TextField
                select
                fullWidth
                value={queueId}
                onChange={(e) => {
                  setQueueId(e.target.value);
                  setStageId("");
                }}
                size="small"
                sx={fieldSx}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: (value) => {
                      if (queuesLoading) return "Loading queues…";
                      const queue = queues.find((q) => q.id === value);
                      return queue?.name ?? "Select a queue";
                    },
                  },
                }}
              >
                {queues.map((queue) => (
                  <MenuItem key={queue.id} value={queue.id}>
                    {queue.name}
                  </MenuItem>
                ))}
              </TextField>
            </Field>

            <Field label="Stage">
              <TextField
                select
                fullWidth
                value={stageId}
                onChange={(e) => setStageId(e.target.value)}
                size="small"
                disabled={!queueId}
                sx={fieldSx}
                slotProps={{
                  select: {
                    displayEmpty: true,
                    renderValue: (value) => {
                      if (!queueId) return "Select a queue first";
                      if (stagesLoading) return "Loading stages…";
                      const stage = stages.find((s) => s.id === value);
                      return stage?.name ?? "Select a stage";
                    },
                  },
                }}
              >
                {stages.length === 0 ? (
                  <MenuItem disabled value="">
                    No stages in this queue yet
                  </MenuItem>
                ) : (
                  stages.map((stage) => (
                    <MenuItem key={stage.id} value={stage.id}>
                      {stage.name}
                    </MenuItem>
                  ))
                )}
              </TextField>
            </Field>

            {noStepsConfigured && (
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 0.75,
                  px: 1.5,
                  py: 1,
                  border: "1px solid #F5C2C2",
                  borderRadius: "8px",
                  bgcolor: "#FDEBEB",
                  color: "#B23A3A",
                  fontSize: 12,
                }}
              >
                <ErrorOutlineIcon sx={{ fontSize: 15, flexShrink: 0 }} />
                No steps are configured in the system yet — creation may fail
                until one is added.
              </Box>
            )}

            {saveError && (
              <Typography sx={{ fontSize: 12, color: "#B23A3A" }}>
                {saveError}
              </Typography>
            )}
          </Box>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5, pt: 0.5 }}>
          <Button
            onClick={handleClose}
            sx={{ textTransform: "none", fontWeight: 600, fontSize: 12.5, color: "#5A5A5A" }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit || saving}
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
            {saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Create"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
