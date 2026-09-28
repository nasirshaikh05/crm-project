"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  TextField,
  Avatar,
  Chip,
  IconButton,
  CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";

import AnimatedDropdown from "../components/AnimatedDropdown";
import { useLeadDetails } from "@/app/lib/hooks/useLeadDetails";
import { useQueues } from "@/app/lib/hooks/useQueues";
import { useStages } from "@/app/lib/hooks/useStages";
import { useToast } from "@/app/components/ToastProvider";
import type { ApiError } from "@/app/lib/api";

const MotionButton = motion.create(Button);

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "8px",
    fontSize: 13,
  },
};

const labelSx = {
  fontSize: 11,
  fontWeight: 700,
  color: "#8A8A8A",
  mb: 0.5,
};

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <Box>
      <Typography sx={labelSx}>{label}</Typography>
      {children}
    </Box>
  );
}

function colorForId(id: string): string {
  const palette = ["#8AB4F8", "#57BB8A", "#B79CED", "#F0A860", "#E88A9A", "#5FB8B0", "#E0A9E8"];
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return palette[hash % palette.length];
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function LeadDetailsPage() {
  const params = useParams<{ id: string }>();
  const leadId = params.id;
  const router = useRouter();
  const { showToast } = useToast();

  const { details, loading, error, updateLead, uploadAttachment, reassign } =
    useLeadDetails(leadId);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phoneNumber, setPhoneNumber] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [notes, setNotes] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);
  const [uploadingAttachment, setUploadingAttachment] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  // Reassign draft — separate from the lead's own saved queue/stage names
  // until "Reassign" is actually clicked.
  const [queueName, setQueueName] = useState("");
  const [stageName, setStageName] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const { queues, loading: queuesLoading, createQueue } = useQueues();
  const selectedQueue = queues.find((q) => q.name === queueName) ?? null;
  const { stages, loading: stagesLoading, createStage } = useStages(selectedQueue?.id ?? null);

  // Loads once per fetched lead — reset the drafts whenever a fresh
  // `details` object arrives (initial load, or after a save/reassign).
  const [trackedLeadId, setTrackedLeadId] = useState<string | null>(null);
  if (details && trackedLeadId !== details.lead.id + details.lead.updatedAt) {
    setTrackedLeadId(details.lead.id + details.lead.updatedAt);
    setFirstName(details.lead.firstName);
    setLastName(details.lead.lastName);
    setEmail(details.lead.email);
    setPhoneNumber(details.lead.phoneNumber);
    setSuburb(details.lead.suburb ?? "");
    setState(details.lead.state ?? "");
    setPostcode(details.lead.postcode ?? "");
    setNotes(details.lead.notes ?? "");
    setQueueName(details.workflow.queue?.name ?? "");
    setStageName(details.workflow.stage?.name ?? "");
  }

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const canSaveInfo = Boolean(firstName.trim() && lastName.trim() && email.trim() && phoneNumber.trim());

  const handleSaveInfo = async () => {
    if (!canSaveInfo) return;
    setSavingInfo(true);
    try {
      await updateLead({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim(),
        phoneNumber: phoneNumber.trim(),
        suburb: suburb.trim() || undefined,
        state: state.trim() || undefined,
        postcode: postcode.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      showToast("Lead updated", "success");
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to update lead", "error");
    } finally {
      setSavingInfo(false);
    }
  };

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingAttachment(true);
    try {
      await uploadAttachment(file);
      showToast("Attachment uploaded", "success");
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to upload attachment", "error");
    } finally {
      setUploadingAttachment(false);
    }
  };

  const selectedStage = stages.find((s) => s.name === stageName) ?? null;
  const canReassign = Boolean(selectedQueue && selectedStage);

  const handleReassign = async () => {
    if (!selectedQueue || !selectedStage) return;
    setReassigning(true);
    try {
      await reassign(
        { queueId: selectedQueue.id, stageId: selectedStage.id },
        { queue: selectedQueue, stage: selectedStage },
      );
      showToast("Lead reassigned", "success");
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to reassign lead", "error");
    } finally {
      setReassigning(false);
    }
  };

  if (loading && !details) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (!details) {
    return (
      <Box sx={{ maxWidth: 1440, mx: "auto" }}>
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
            fontSize: 12.5,
          }}
        >
          <ErrorOutlineIcon sx={{ fontSize: 16 }} />
          {error ?? "This lead isn't available."}
        </Box>
      </Box>
    );
  }

  const lead = details.lead;

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2.5 }}>
          <IconButton size="small" onClick={() => router.push("/leads")}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              fontSize: 14,
              fontWeight: 700,
              bgcolor: colorForId(lead.id),
              color: "#1A1A1A",
            }}
          >
            {lead.firstName[0]}
            {lead.lastName[0]}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>
              {lead.firstName} {lead.lastName}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "#8A8A8A" }}>
              Eziyo / Leads Management / {lead.firstName} {lead.lastName}
            </Typography>
          </Box>
          <Chip
            label={lead.status}
            size="small"
            sx={{
              textTransform: "capitalize",
              fontSize: 11.5,
              fontWeight: 700,
              bgcolor: lead.status === "active" ? "#EAF2FE" : "#F5F5F5",
              color: lead.status === "active" ? "#1A73E8" : "#5A5A5A",
            }}
          />
        </Box>

        <Box sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}>
          {/* Contact info */}
          <Box
            sx={{
              flex: 2,
              border: "1px solid #E0E0E0",
              borderRadius: "12px",
              bgcolor: "#fff",
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 2,
            }}
          >
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#1A1A1A" }}>
              Contact info
            </Typography>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Field label="First name">
                <TextField
                  fullWidth
                  size="small"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  sx={fieldSx}
                />
              </Field>
              <Field label="Last name">
                <TextField
                  fullWidth
                  size="small"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  sx={fieldSx}
                />
              </Field>
            </Box>

            <Field label="Email">
              <TextField
                fullWidth
                size="small"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                sx={fieldSx}
              />
            </Field>

            <Field label="Phone number">
              <TextField
                fullWidth
                size="small"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                sx={fieldSx}
              />
            </Field>

            <Box sx={{ display: "flex", gap: 1.5 }}>
              <Field label="Suburb">
                <TextField
                  fullWidth
                  size="small"
                  value={suburb}
                  onChange={(e) => setSuburb(e.target.value)}
                  sx={fieldSx}
                />
              </Field>
              <Field label="State">
                <TextField
                  fullWidth
                  size="small"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  sx={fieldSx}
                />
              </Field>
              <Field label="Postcode">
                <TextField
                  fullWidth
                  size="small"
                  value={postcode}
                  onChange={(e) => setPostcode(e.target.value)}
                  sx={fieldSx}
                />
              </Field>
            </Box>

            <Field label="Notes">
              <TextField
                fullWidth
                multiline
                minRows={3}
                size="small"
                placeholder="Add notes about this lead…"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                sx={fieldSx}
              />
            </Field>

            <Box>
              <Typography sx={labelSx}>Attachments</Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                {(details.lead.attachments ?? []).map((att, i) => (
                  <Box
                    key={i}
                    component="a"
                    href={att.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{
                      display: "flex",
                      alignItems: "center",
                      gap: 0.75,
                      px: 1.25,
                      py: 0.75,
                      border: "1px solid #E0E0E0",
                      borderRadius: "8px",
                      textDecoration: "none",
                      "&:hover": { borderColor: "#1A73E8" },
                    }}
                  >
                    <InsertDriveFileOutlinedIcon sx={{ fontSize: 16, color: "#5A5A5A" }} />
                    <Typography sx={{ fontSize: 12.5, color: "#1A1A1A", flex: 1, minWidth: 0 }}>
                      {att.name}
                    </Typography>
                    <Typography sx={{ fontSize: 11, color: "#8A8A8A" }}>
                      {formatFileSize(att.size)}
                    </Typography>
                  </Box>
                ))}

                <input
                  ref={fileInputRef}
                  type="file"
                  hidden
                  onChange={handleFileSelected}
                />
                <MotionButton
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  startIcon={
                    uploadingAttachment ? (
                      <CircularProgress size={14} />
                    ) : (
                      <AttachFileIcon sx={{ fontSize: 16 }} />
                    )
                  }
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploadingAttachment}
                  variant="outlined"
                  sx={{
                    alignSelf: "flex-start",
                    textTransform: "none",
                    fontWeight: 600,
                    fontSize: 12.5,
                    borderColor: "#E0E0E0",
                    color: "#5A5A5A",
                    "&:hover": { borderColor: "#1A73E8", color: "#1A73E8" },
                  }}
                >
                  {uploadingAttachment ? "Uploading…" : "Upload attachment"}
                </MotionButton>
              </Box>
            </Box>

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <MotionButton
                whileHover={canSaveInfo ? { scale: 1.03 } : undefined}
                whileTap={canSaveInfo ? { scale: 0.97 } : undefined}
                startIcon={
                  savingInfo ? (
                    <CircularProgress size={14} sx={{ color: "#fff" }} />
                  ) : (
                    <SaveOutlinedIcon sx={{ fontSize: 16 }} />
                  )
                }
                onClick={handleSaveInfo}
                disabled={!canSaveInfo || savingInfo}
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
                Save
              </MotionButton>
            </Box>
          </Box>

          {/* Pipeline / reassign */}
          <Box
            sx={{
              flex: 1,
              border: "1px solid #E0E0E0",
              borderRadius: "12px",
              bgcolor: "#fff",
              p: 2.5,
              display: "flex",
              flexDirection: "column",
              gap: 1.5,
            }}
          >
            <Typography sx={{ fontSize: 13.5, fontWeight: 700, color: "#1A1A1A" }}>
              Pipeline
            </Typography>

            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: "#8A8A8A" }}>Current queue</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
                {details.workflow.queue?.name ?? "Unassigned"}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: "#8A8A8A" }}>Current stage</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
                {details.workflow.stage?.name ?? "-"}
              </Typography>
            </Box>

            <Box sx={{ borderTop: "1px solid #F0F0F0", mt: 0.5, pt: 1.5 }}>
              <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#5A5A5A", mb: 1 }}>
                Reassign
              </Typography>

              <AnimatedDropdown
                label="Queue"
                value={queueName}
                options={queues.map((q) => q.name)}
                loading={queuesLoading}
                placeholder="Select a queue"
                addNewLabel="Add new queue"
                onChange={(next) => {
                  setQueueName(next);
                  setStageName("");
                }}
                onAddNew={(name) => createQueue({ name, isActive: true })}
              />

              <AnimatedDropdown
                label="Stage"
                value={stageName}
                options={stages.map((s) => s.name)}
                loading={Boolean(selectedQueue) && stagesLoading}
                placeholder="Select a stage"
                disabled={!selectedQueue}
                disabledHint="Select a queue first"
                addNewLabel="Add new stage"
                onChange={setStageName}
                onAddNew={(name) => {
                  if (!selectedQueue) return Promise.reject(new Error("Select a queue first"));
                  return createStage({
                    queueId: selectedQueue.id,
                    name,
                    orderIndex: stages.length,
                  });
                }}
              />

              <MotionButton
                fullWidth
                whileHover={canReassign ? { scale: 1.01 } : undefined}
                whileTap={canReassign ? { scale: 0.98 } : undefined}
                startIcon={
                  reassigning ? <CircularProgress size={14} sx={{ color: "#fff" }} /> : undefined
                }
                onClick={handleReassign}
                disabled={!canReassign || reassigning}
                variant="contained"
                sx={{
                  mt: 0.5,
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 12.5,
                  boxShadow: "none",
                  bgcolor: "#1A73E8",
                  "&:hover": { bgcolor: "#1660C4", boxShadow: "none" },
                }}
              >
                Reassign
              </MotionButton>
            </Box>
          </Box>
        </Box>
      </Box>
    </motion.div>
  );
}
