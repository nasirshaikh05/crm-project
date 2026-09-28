"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  Button,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Divider,
  CircularProgress,
} from "@mui/material";
import { motion, type Variants } from "framer-motion";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AddIcon from "@mui/icons-material/Add";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";

import { useQueues } from "@/app/lib/hooks/useQueues";
import { useStages } from "@/app/lib/hooks/useStages";
import type { Queue, Stage } from "@/app/lib/api/types";
import { useToast } from "@/app/components/ToastProvider";
import StageCard from "./StageCard";

interface StageBoardProps {
  onSelectStage?: (stage: Stage) => void;
  onQueueChange?: (queue: Queue) => void;
  /** Bumped by the parent after an action (e.g. allocate) that may have
   *  changed which leads sit in a stage, forcing every stage card to
   *  refetch its (server-paginated) lead list. */
  refreshKey?: number;
}

const MotionBox = motion.create(Box);
const MotionButton = motion.create(Button);

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants: Variants = {
  hidden: {
    opacity: 0,
    y: 12,
  },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.35,
      ease: "easeOut",
    },
  },
};

export default function StageBoard({
  onSelectStage,
  onQueueChange,
  refreshKey = 0,
}: StageBoardProps) {
  const { showToast } = useToast();
  const {
    queues,
    loading: queuesLoading,
    error: queuesError,
    createQueue,
  } = useQueues();

  const [selectedQueueId, setSelectedQueueId] = useState<string | null>(null);
  // Falls back to the first loaded queue until the user (or a create-queue
  // action) explicitly picks one — derived during render instead of an
  // effect, so there's no extra render pass just to "catch up".
  const effectiveQueueId = selectedQueueId ?? queues[0]?.id ?? null;
  const selectedQueue = queues.find((q) => q.id === effectiveQueueId) ?? null;

  const {
    stages: currentStages,
    loading: stagesLoading,
    error: stagesError,
    createStage,
  } = useStages(effectiveQueueId);

  // The parent needs to know which queue is active even when it's just the
  // default first one (no explicit switch ever happened) — e.g. StepPanel
  // uses this to scope its "go to stage" picker to the right queue.
  useEffect(() => {
    if (selectedQueue) onQueueChange?.(selectedQueue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedQueue?.id]);

  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  // Whenever the stage list itself changes (new queue, stage created), reset
  // to the first stage — and tell the parent it's selected too, otherwise
  // the stage shows expanded here while its action panel never appears,
  // since that panel only opens in response to onSelectStage.
  useEffect(() => {
    const first = currentStages[0] ?? null;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setExpandedStageId(first?.id ?? null);
    if (first) onSelectStage?.(first);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStages]);

  // Dropdown menu state
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const menuOpen = Boolean(anchorEl);

  // Add Queue dialog state
  const [queueDialogOpen, setQueueDialogOpen] = useState(false);
  const [newQueueName, setNewQueueName] = useState("");
  const [savingQueue, setSavingQueue] = useState(false);
  const [queueSaveError, setQueueSaveError] = useState<string | null>(null);

  // Add Stage dialog state
  const [stageDialogOpen, setStageDialogOpen] = useState(false);
  const [newStageName, setNewStageName] = useState("");
  const [savingStage, setSavingStage] = useState(false);
  const [stageSaveError, setStageSaveError] = useState<string | null>(null);

  const handleOpenMenu = (e: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(e.currentTarget);
  };

  const handleCloseMenu = () => {
    setAnchorEl(null);
  };

  const handleSelectQueue = (queue: Queue) => {
    handleCloseMenu();
    if (queue.id === effectiveQueueId) return;
    setSelectedQueueId(queue.id);
  };

  const handleOpenQueueDialog = () => {
    handleCloseMenu();
    setQueueSaveError(null);
    setQueueDialogOpen(true);
  };

  const handleCloseQueueDialog = () => {
    setQueueDialogOpen(false);
    setNewQueueName("");
    setQueueSaveError(null);
  };

  const handleSaveQueue = async () => {
    const trimmed = newQueueName.trim();
    if (!trimmed) return;
    setSavingQueue(true);
    setQueueSaveError(null);
    try {
      const queue = await createQueue({ name: trimmed, isActive: true });
      setSelectedQueueId(queue.id);
      handleCloseQueueDialog();
      showToast(`Queue "${queue.name}" created`, "success");
    } catch (err) {
      const message =
        (err as { message?: string }).message ?? "Failed to create queue";
      setQueueSaveError(message);
      showToast(message, "error");
    } finally {
      setSavingQueue(false);
    }
  };

  const handleOpenStageDialog = () => {
    setStageSaveError(null);
    setStageDialogOpen(true);
  };

  const handleCloseStageDialog = () => {
    setStageDialogOpen(false);
    setNewStageName("");
    setStageSaveError(null);
  };

  const handleSaveStage = async () => {
    const trimmed = newStageName.trim();
    if (!trimmed || !effectiveQueueId) return;
    setSavingStage(true);
    setStageSaveError(null);
    try {
      const stage = await createStage({
        queueId: effectiveQueueId,
        name: trimmed,
        orderIndex: currentStages.length,
      });
      setExpandedStageId(stage.id);
      onSelectStage?.(stage);
      handleCloseStageDialog();
      showToast(`Stage "${stage.name}" created`, "success");
    } catch (err) {
      const message =
        (err as { message?: string }).message ?? "Failed to create stage";
      setStageSaveError(message);
      showToast(message, "error");
    } finally {
      setSavingStage(false);
    }
  };

  return (
    <Box>
      {/* Queue header */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          mb: 1.5,
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <Box
            onClick={handleOpenMenu}
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.5,
              border: "1px solid #E0E0E0",
              borderRadius: "8px",
              px: 1.25,
              py: 0.5,
              fontSize: 13,
              fontWeight: 600,
              cursor: "pointer",
              "&:hover": { bgcolor: "#F9F9F9" },
            }}
          >
            {queuesLoading ? (
              <CircularProgress size={13} sx={{ mx: 0.5 }} />
            ) : selectedQueue ? (
              `Queue ${queues.findIndex((q) => q.id === selectedQueue.id) + 1}: ${selectedQueue.name}`
            ) : (
              "Select a queue"
            )}
            <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "#8A8A8A" }} />
          </Box>

          <Menu
            anchorEl={anchorEl}
            open={menuOpen}
            onClose={handleCloseMenu}
            slotProps={{
              paper: {
                sx: {
                  minWidth: 200,
                  border: "1px solid #E0E0E0",
                  borderRadius: "10px",
                  boxShadow: "0 8px 24px rgba(0,0,0,0.08)",
                  mt: 0.5,
                },
              },
            }}
          >
            {queues.map((queue, queueIdx) => (
              <MenuItem
                key={queue.id}
                selected={queue.id === effectiveQueueId}
                onClick={() => handleSelectQueue(queue)}
                sx={{
                  fontSize: 13,
                  fontWeight: queue.id === effectiveQueueId ? 700 : 500,
                  color: queue.id === effectiveQueueId ? "#1A73E8" : "#1A1A1A",
                }}
              >
                Queue {queueIdx + 1}: {queue.name}
              </MenuItem>
            ))}

            <Divider sx={{ my: 0.5 }} />

            <MenuItem
              onClick={handleOpenQueueDialog}
              sx={{
                fontSize: 13,
                fontWeight: 400,
                color: "#1A73E8",
                display: "flex",
                gap: 0.75,
              }}
            >
              <AddIcon sx={{ fontSize: 16 }} />
              New queue
            </MenuItem>
          </Menu>

          <Button
            onClick={handleOpenQueueDialog}
            startIcon={<AddIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 12.5,
              color: "#1A73E8",
            }}
          >
            New Queue
          </Button>
        </Box>
      </Box>

      {queuesError && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            mb: 1.5,
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
          Couldn&apos;t load queues — {queuesError}
        </Box>
      )}

      {/* Add Queue dialog */}
      <Dialog
        open={queueDialogOpen}
        onClose={handleCloseQueueDialog}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "12px" } },
        }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>
          Create new queue
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            placeholder="Queue name"
            value={newQueueName}
            onChange={(e) => setNewQueueName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveQueue();
            }}
            size="small"
            sx={{
              mt: 0.5,
              borderRadius: "8px",
              "& .MuiOutlinedInput-root": { borderRadius: "8px" },
            }}
          />
          {queueSaveError && (
            <Typography sx={{ fontSize: 12, color: "#B23A3A", mt: 1 }}>
              {queueSaveError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseQueueDialog}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 12.5,
              color: "#5A5A5A",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveQueue}
            disabled={!newQueueName.trim() || savingQueue}
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
            {savingQueue ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Add Stage dialog */}
      <Dialog
        open={stageDialogOpen}
        onClose={handleCloseStageDialog}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: { sx: { borderRadius: "12px" } },
        }}
      >
        <DialogTitle sx={{ fontSize: 15, fontWeight: 700 }}>
          Create new stage
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            placeholder="Stage name"
            value={newStageName}
            onChange={(e) => setNewStageName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveStage();
            }}
            size="small"
            sx={{
              mt: 0.5,
              borderRadius: "8px",
              "& .MuiOutlinedInput-root": { borderRadius: "8px" },
            }}
          />
          {stageSaveError && (
            <Typography sx={{ fontSize: 12, color: "#B23A3A", mt: 1 }}>
              {stageSaveError}
            </Typography>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button
            onClick={handleCloseStageDialog}
            sx={{
              textTransform: "none",
              fontWeight: 600,
              fontSize: 12.5,
              color: "#5A5A5A",
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSaveStage}
            disabled={!newStageName.trim() || savingStage}
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
            {savingStage ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Save"}
          </Button>
        </DialogActions>
      </Dialog>

      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Typography sx={{ fontSize: 12, color: "#8A8A8A" }}>
          Home &gt; {selectedQueue?.name ?? "—"} &gt;{" "}
          <Typography
            component="span"
            sx={{ color: "#1A73E8", fontWeight: 400, fontSize: 12.5 }}
          >
            {currentStages.find((s) => s.id === expandedStageId)?.name}
          </Typography>
        </Typography>
        <Button
          onClick={handleOpenStageDialog}
          disabled={!effectiveQueueId}
          startIcon={<AddIcon sx={{ fontSize: 16 }} />}
          sx={{
            alignSelf: "flex-start",
            textTransform: "none",
            fontWeight: 600,
            fontSize: 11.5,
            color: "#1A73E8",
          }}
        >
          New Stage
        </Button>
      </Box>

      {stagesError && (
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.75,
            mt: 1,
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
          Couldn&apos;t load stages — {stagesError}
        </Box>
      )}

      {/* Stage cards */}
      <MotionBox
        variants={containerVariants}
        initial="hidden"
        animate="show"
        sx={{
          display: "flex",
          flexDirection: "column",
          gap: 1.5,
          mt: 1.5,
          minHeight: currentStages.length === 0 ? 220 : "auto",
        }}
      >
        {stagesLoading ? (
          <Box sx={{ flex: 1, display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={22} />
          </Box>
        ) : currentStages.length === 0 ? (
          <MotionBox
            variants={itemVariants}
            initial="hidden"
            animate="show"
            sx={{
              flex: 1,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 1,
              py: 6,
              px: 2,
              textAlign: "center",
            }}
          >
            <Typography sx={{ fontSize: 13, color: "#8A8A8A" }}>
              No stages available in <b>{selectedQueue?.name ?? "this queue"}</b>.
              Create one to get started.
            </Typography>
            <MotionButton
              variant="contained"
              onClick={handleOpenStageDialog}
              disabled={!effectiveQueueId}
              startIcon={<AddIcon sx={{ fontSize: 16 }} />}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.97 }}
              sx={{
                textTransform: "none",
                fontWeight: 500,
                fontSize: 12.5,
                boxShadow: "none",
                bgcolor: "#1A73E8",
                "&:hover": { bgcolor: "#1660C4", boxShadow: "none" },
              }}
            >
              New Stage
            </MotionButton>
          </MotionBox>
        ) : (
          currentStages.map((stage, idx) => (
            <StageCard
              key={stage.id}
              stage={stage}
              index={idx}
              isExpanded={expandedStageId === stage.id}
              refreshKey={refreshKey}
              onExpand={() => {
                setExpandedStageId(stage.id);
                onSelectStage?.(stage);
              }}
            />
          ))
        )}
      </MotionBox>
    </Box>
  );
}
