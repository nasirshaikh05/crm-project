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

import AnimatedDropdown from "../../leads/components/AnimatedDropdown";
import { useCustomerDetails } from "@/app/lib/hooks/useCustomerDetails";
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

export default function CustomerDetailsPage() {
  const params = useParams<{ id: string }>();
  const customerId = params.id;
  const router = useRouter();
  const { showToast } = useToast();

  const { customer, loading, error, updateCustomer } = useCustomerDetails(customerId);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [suburb, setSuburb] = useState("");
  const [state, setState] = useState("");
  const [postcode, setPostcode] = useState("");
  const [savingInfo, setSavingInfo] = useState(false);

  // Reassign draft — separate from the customer's own saved queue/stage
  // names until "Reassign" is actually clicked.
  const [queueName, setQueueName] = useState("");
  const [stageName, setStageName] = useState("");
  const [reassigning, setReassigning] = useState(false);

  const { queues, loading: queuesLoading, createQueue } = useQueues();
  const selectedQueue = queues.find((q) => q.name === queueName) ?? null;
  const { stages, loading: stagesLoading, createStage } = useStages(selectedQueue?.id ?? null);

  // Independent of the reassign draft — always reflects what the customer
  // is actually currently assigned to, even while the user is mid-pick in
  // the dropdowns below.
  const { stages: currentStages, loading: currentStagesLoading } = useStages(
    customer?.currentQueueId ?? null,
  );
  const currentQueueName = customer
    ? (queues.find((q) => q.id === customer.currentQueueId)?.name ?? "Unassigned")
    : "Unassigned";
  const currentStageName = customer
    ? (currentStages.find((s) => s.id === customer.currentStageId)?.name ?? "-")
    : "-";

  // Resets the contact-info draft whenever a fresh `customer` object arrives
  // (initial load, or after a save).
  const [trackedCustomerId, setTrackedCustomerId] = useState<string | null>(null);
  if (customer && trackedCustomerId !== customer.id + customer.updatedAt) {
    setTrackedCustomerId(customer.id + customer.updatedAt);
    setFirstName(customer.firstName);
    setLastName(customer.lastName);
    setEmail(customer.email ?? "");
    setPhone(customer.phone ?? "");
    setSuburb(customer.suburb ?? "");
    setState(customer.state ?? "");
    setPostcode(customer.postcode ?? "");
  }

  // Seeds the reassign draft to the customer's current queue/stage once —
  // waits for both lookups to resolve so it doesn't briefly flash empty.
  const [reassignInitedFor, setReassignInitedFor] = useState<string | null>(null);
  useEffect(() => {
    if (!customer) return;
    const key = customer.id + customer.updatedAt;
    if (reassignInitedFor === key) return;
    if (queuesLoading || currentStagesLoading) return;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setQueueName(queues.find((q) => q.id === customer.currentQueueId)?.name ?? "");
    setStageName(currentStages.find((s) => s.id === customer.currentStageId)?.name ?? "");
    setReassignInitedFor(key);
  }, [customer, queues, queuesLoading, currentStages, currentStagesLoading, reassignInitedFor]);

  useEffect(() => {
    if (error) showToast(error, "error");
  }, [error, showToast]);

  const canSaveInfo = Boolean(firstName.trim() && lastName.trim());

  const handleSaveInfo = async () => {
    if (!canSaveInfo) return;
    setSavingInfo(true);
    try {
      await updateCustomer({
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim() || undefined,
        phone: phone.trim() || undefined,
        suburb: suburb.trim() || undefined,
        state: state.trim() || undefined,
        postcode: postcode.trim() || undefined,
      });
      showToast("Customer updated", "success");
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to update customer", "error");
    } finally {
      setSavingInfo(false);
    }
  };

  const selectedStage = stages.find((s) => s.name === stageName) ?? null;
  const canReassign = Boolean(selectedQueue && selectedStage);

  const handleReassign = async () => {
    if (!selectedQueue || !selectedStage) return;
    setReassigning(true);
    try {
      await updateCustomer({ currentQueueId: selectedQueue.id, currentStageId: selectedStage.id });
      showToast("Customer reassigned", "success");
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to reassign customer", "error");
    } finally {
      setReassigning(false);
    }
  };

  if (loading && !customer) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  if (!customer) {
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
          {error ?? "This customer isn't available."}
        </Box>
      </Box>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ maxWidth: 1100, mx: "auto" }}>
        {/* Header */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2.5 }}>
          <IconButton size="small" onClick={() => router.push("/customers")}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Avatar
            sx={{
              width: 40,
              height: 40,
              fontSize: 14,
              fontWeight: 700,
              bgcolor: colorForId(customer.id),
              color: "#1A1A1A",
            }}
          >
            {customer.firstName[0]}
            {customer.lastName[0]}
          </Avatar>
          <Box sx={{ minWidth: 0, flex: 1 }}>
            <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>
              {customer.firstName} {customer.lastName}
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "#8A8A8A" }}>
              Eziyo / Customer Management / {customer.firstName} {customer.lastName}
            </Typography>
          </Box>
          <Chip
            label={customer.status}
            size="small"
            sx={{
              textTransform: "capitalize",
              fontSize: 11.5,
              fontWeight: 700,
              bgcolor: customer.status === "active" ? "#EAF2FE" : "#F5F5F5",
              color: customer.status === "active" ? "#1A73E8" : "#5A5A5A",
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
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
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
                {currentQueueName}
              </Typography>
            </Box>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 0.5 }}>
              <Typography sx={{ fontSize: 11, color: "#8A8A8A" }}>Current stage</Typography>
              <Typography sx={{ fontSize: 13, fontWeight: 600, color: "#1A1A1A" }}>
                {currentStageName}
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
