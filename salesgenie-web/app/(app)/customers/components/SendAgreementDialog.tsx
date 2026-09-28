"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogTitle,
  DialogContent,
  IconButton,
  Typography,
  TextField,
  Box,
  Button,
  Checkbox,
  Divider,
} from "@mui/material";
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import GestureOutlinedIcon from "@mui/icons-material/GestureOutlined";
import HistoryEduOutlinedIcon from "@mui/icons-material/HistoryEduOutlined";

import RichTextEditor from "@/app/components/RichTextEditor";

interface SendAgreementDialogProps {
  customerName: string;
  customerEmail: string;
  onClose: () => void;
}

const MotionButton = motion.create(Button);

const fieldSx = {
  "& .MuiOutlinedInput-root": {
    borderRadius: "6px",
    fontSize: 12.5,
  },
  "& .MuiOutlinedInput-notchedOutline": { borderColor: "#E0E0E0" },
};

export default function SendAgreementDialog({
  customerName,
  customerEmail,
  onClose,
}: SendAgreementDialogProps) {
  const [to, setTo] = useState(customerEmail);
  const [title, setTitle] = useState(`Service Agreement — ${customerName}`);
  const [bodyHtml, setBodyHtml] = useState("");
  const [attachmentName, setAttachmentName] = useState<string | null>(null);
  const [requireConfirmation, setRequireConfirmation] = useState(true);

  const canSend = Boolean(to.trim() && title.trim());

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: "14px" } } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
          <HistoryEduOutlinedIcon sx={{ fontSize: 19, color: "#1A73E8" }} />
          <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
            Send agreement for signature
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ pt: 0.5, pb: 2 }}>
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5, mb: 1.75 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="To"
            value={to}
            onChange={(e) => setTo(e.target.value)}
            sx={fieldSx}
          />
          <TextField
            size="small"
            fullWidth
            placeholder="Agreement title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            sx={fieldSx}
          />
        </Box>

        {/* Agreement document card */}
        <Box
          sx={{
            border: "1px solid #E0E0E0",
            borderRadius: "10px",
            bgcolor: "#FAFBFE",
            overflow: "hidden",
          }}
        >
          <RichTextEditor
            value={bodyHtml}
            onChange={setBodyHtml}
            placeholder="Enter the agreement terms the customer will review…"
            minHeight={110}
          />

          <Box sx={{ px: 2, pb: 1.5 }}>
            {attachmentName ? (
              <Box
                sx={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 0.75,
                  border: "1px solid #E0E0E0",
                  borderRadius: "8px",
                  bgcolor: "#fff",
                  px: 1.25,
                  py: 0.5,
                  fontSize: 12,
                  color: "#1A1A1A",
                }}
              >
                <AttachFileIcon sx={{ fontSize: 15, color: "#8A8A8A" }} />
                {attachmentName}
                <IconButton
                  size="small"
                  onClick={() => setAttachmentName(null)}
                  sx={{ color: "#B0B0B0", p: 0.25 }}
                >
                  <CloseIcon sx={{ fontSize: 13 }} />
                </IconButton>
              </Box>
            ) : (
              <Button
                startIcon={<AttachFileIcon sx={{ fontSize: 16 }} />}
                component="label"
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1A73E8",
                  border: "1px dashed #BFD6F5",
                  borderRadius: "8px",
                  px: 1.5,
                }}
              >
                Attach agreement document
                <input
                  type="file"
                  hidden
                  onChange={(e) =>
                    setAttachmentName(e.target.files?.[0]?.name ?? null)
                  }
                />
              </Button>
            )}
          </Box>

          <Divider />

          {/* Signature request block */}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 0.5,
                width: "fit-content",
              }}
            >
              <Checkbox
                size="small"
                checked={requireConfirmation}
                onChange={() => setRequireConfirmation((v) => !v)}
                sx={{ p: 0.5 }}
              />
              <Typography
                onClick={() => setRequireConfirmation((v) => !v)}
                sx={{ fontSize: 12.5, color: "#1A1A1A", cursor: "pointer" }}
              >
                Include &ldquo;I have read and understood this agreement&rdquo; confirmation
              </Typography>
            </Box>

            <motion.div
              initial={false}
              animate={{
                opacity: requireConfirmation ? 1 : 0.4,
                height: "auto",
              }}
              transition={{ duration: 0.2 }}
            >
              <Box
                sx={{
                  mt: 1.25,
                  border: "1px dashed #BFD6F5",
                  borderRadius: "10px",
                  py: 2.5,
                  textAlign: "center",
                }}
              >
                <GestureOutlinedIcon sx={{ fontSize: 26, color: "#B7C6DE" }} />
                <Typography
                  sx={{ fontSize: 12.5, fontWeight: 600, color: "#5A5A5A", mt: 0.5 }}
                >
                  Signature
                </Typography>
                <Typography sx={{ fontSize: 11.5, color: "#B0B0B0" }}>
                  {customerName} signs here once they open the agreement
                </Typography>
              </Box>
            </motion.div>
          </Box>
        </Box>

        {/* Footer */}
        <Box sx={{ display: "flex", justifyContent: "flex-end", gap: 1, mt: 2 }}>
          <MotionButton
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.96 }}
            onClick={onClose}
            sx={{ textTransform: "none", fontWeight: 600, fontSize: 12, color: "#5A5A5A" }}
          >
            Cancel
          </MotionButton>
          <MotionButton
            whileHover={canSend ? { scale: 1.03 } : undefined}
            whileTap={canSend ? { scale: 0.96 } : undefined}
            onClick={onClose}
            disabled={!canSend}
            variant="contained"
            startIcon={<HistoryEduOutlinedIcon sx={{ fontSize: 16 }} />}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: 12,
              boxShadow: "none",
              bgcolor: "#1A73E8",
              "&:hover": { bgcolor: "#1660C4", boxShadow: "none" },
            }}
          >
            Send for Signature
          </MotionButton>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
