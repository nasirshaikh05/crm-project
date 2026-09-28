"use client";

import React, { useState } from "react";
import { Popover, Box, Typography, Button } from "@mui/material";
import { motion } from "framer-motion";

import AnimatedDropdown from "./AnimatedDropdown";
import { useQueues } from "@/app/lib/hooks/useQueues";
import { useStages } from "@/app/lib/hooks/useStages";

interface AssignLeadPanelProps {
  anchorEl: HTMLElement | null;
  leadName: string;
  currentQueue: string | null;
  currentStage: string | null;
  onClose: () => void;
  /** Real queue/stage IDs — this is what actually persists the move. */
  onSave: (queueId: string, stageId: string) => void;
}

const MotionButton = motion.create(Button);

export default function AssignLeadPanel({
  anchorEl,
  leadName,
  currentQueue,
  currentStage,
  onClose,
  onSave,
}: AssignLeadPanelProps) {
  const { queues, loading: queuesLoading, createQueue } = useQueues();
  const [queue, setQueue] = useState(currentQueue ?? "");
  const [stage, setStage] = useState(currentStage ?? "");

  const selectedQueue = queues.find((q) => q.name === queue) ?? null;
  const {
    stages,
    loading: stagesLoading,
    createStage,
  } = useStages(selectedQueue?.id ?? null);

  const selectedStage = stages.find((s) => s.name === stage) ?? null;

  const reset = () => {
    setQueue(currentQueue ?? "");
    setStage(currentStage ?? "");
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleSave = () => {
    if (!selectedQueue || !selectedStage) return;
    onSave(selectedQueue.id, selectedStage.id);
  };

  return (
    <Popover
      open={Boolean(anchorEl)}
      anchorEl={anchorEl}
      onClose={handleClose}
      anchorOrigin={{ vertical: "bottom", horizontal: "right" }}
      transformOrigin={{ vertical: "top", horizontal: "right" }}
      slotProps={{
        paper: {
          sx: {
            mt: 0.75,
            width: 280,
            borderRadius: "12px",
            border: "1px solid #E0E0E0",
            boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
            p: 2,
          },
        },
      }}
    >
      <Typography sx={{ fontSize: 13, fontWeight: 700, mb: 0.25 }}>
        Assign lead
      </Typography>
      <Typography sx={{ fontSize: 12, color: "#8A8A8A", mb: 1.5 }}>
        {leadName}
      </Typography>

      <AnimatedDropdown
        label="Queue"
        value={queue}
        options={queues.map((q) => q.name)}
        loading={queuesLoading}
        placeholder="Select a queue"
        addNewLabel="Add new queue"
        onChange={(next) => {
          setQueue(next);
          setStage("");
        }}
        onAddNew={(name) => createQueue({ name, isActive: true })}
      />

      <AnimatedDropdown
        label="Stage"
        value={stage}
        options={stages.map((s) => s.name)}
        loading={Boolean(selectedQueue) && stagesLoading}
        placeholder="Select a stage"
        disabled={!selectedQueue}
        disabledHint="Select a queue first"
        addNewLabel="Add new stage"
        onChange={setStage}
        onAddNew={(name) => {
          if (!selectedQueue) return Promise.reject(new Error("Select a queue first"));
          return createStage({
            queueId: selectedQueue.id,
            name,
            orderIndex: stages.length,
          });
        }}
      />

      <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 0.5 }}>
        <MotionButton
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.96 }}
          onClick={handleClose}
          sx={{
            textTransform: "none",
            fontWeight: 600,
            fontSize: 12,
            color: "#5A5A5A",
          }}
        >
          Cancel
        </MotionButton>
        <MotionButton
          whileHover={selectedQueue && selectedStage ? { scale: 1.03 } : undefined}
          whileTap={selectedQueue && selectedStage ? { scale: 0.96 } : undefined}
          onClick={handleSave}
          disabled={!selectedQueue || !selectedStage}
          variant="contained"
          sx={{
            textTransform: "none",
            fontWeight: 700,
            fontSize: 12,
            boxShadow: "none",
            bgcolor: "#1A73E8",
            "&:hover": { bgcolor: "#1660C4", boxShadow: "none" },
          }}
        >
          Save
        </MotionButton>
      </Box>
    </Popover>
  );
}
