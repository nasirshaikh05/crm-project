"use client";

import React from "react";
import { Box, TextField, Button, CircularProgress } from "@mui/material";
import { motion, type Variants } from "framer-motion";
import EventOutlinedIcon from "@mui/icons-material/EventOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";

import type { CalendarInvite } from "../type";

interface CalendarInviteEditorProps {
  invite: CalendarInvite;
  onChange: (invite: CalendarInvite) => void;
  /** Persists the invite content as the stage's saved step. */
  onSend?: () => void | Promise<void>;
  sending?: boolean;
}

const MotionBox = motion.create(Box);

const editorVariants: Variants = {
  hidden: { opacity: 0, height: 0 },
  show: {
    opacity: 1,
    height: "auto",
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: 12.5,
  },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E0E0E0" },
};

export function createEmptyCalendarInvite(): CalendarInvite {
  return {
    title: "",
    description: "",
  };
}

/**
 * The backend has no real calendar-invite mechanism — no .ics generation,
 * no structured fields — it only ever sends whatever's in subject/body, same
 * as every other email step. This editor matches that exactly instead of
 * implying scheduling fields (attendees, time, location) that don't work.
 */
export default function CalendarInviteEditor({
  invite,
  onChange,
  onSend,
  sending = false,
}: CalendarInviteEditorProps) {
  const patch = (fields: Partial<CalendarInvite>) =>
    onChange({ ...invite, ...fields });

  return (
    <MotionBox
      variants={editorVariants}
      initial="hidden"
      animate="show"
      sx={{
        mt: 2,
        border: "1px solid #E0E0E0",
        borderRadius: "10px",
        bgcolor: "#FAFBFE",
        overflow: "hidden",
      }}
    >
      <Box sx={{ px: 2, pt: 1.75, pb: 1.5, display: "flex", flexDirection: "column", gap: 1.25 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Event title"
          value={invite.title}
          onChange={(e) => patch({ title: e.target.value })}
          slotProps={{
            input: {
              startAdornment: (
                <EventOutlinedIcon sx={{ fontSize: 17, color: "#8A8A8A", mr: 1 }} />
              ),
            },
          }}
          sx={fieldSx}
        />

        <TextField
          size="small"
          fullWidth
          multiline
          minRows={3}
          placeholder="Description (include the scheduling link, e.g. a Calendly URL)"
          value={invite.description}
          onChange={(e) => patch({ description: e.target.value })}
          sx={fieldSx}
        />
      </Box>

      {/* Footer actions */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          gap: 0.5,
          px: 2,
          py: 1.25,
          borderTop: "1px solid #EEE",
        }}
      >
        <Button
          startIcon={
            sending ? (
              <CircularProgress size={14} sx={{ color: "#fff" }} />
            ) : (
              <SaveOutlinedIcon sx={{ fontSize: 16 }} />
            )
          }
          onClick={onSend}
          disabled={!onSend || sending}
          variant="contained"
          size="small"
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
        </Button>
      </Box>
    </MotionBox>
  );
}
