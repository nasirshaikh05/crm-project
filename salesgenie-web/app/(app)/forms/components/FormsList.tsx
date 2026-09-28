"use client";

import React, { useState } from "react";
import { Box, Typography, IconButton, Tooltip } from "@mui/material";
import { motion, type Variants } from "framer-motion";
import LinkOutlinedIcon from "@mui/icons-material/LinkOutlined";
import MailOutlineIcon from "@mui/icons-material/MailOutlineOutlined";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlineOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

import { useToast } from "@/app/components/ToastProvider";
import type { FormDefinition } from "@/app/lib/forms/types";
import SendFormEmailDialog from "./SendFormEmailDialog";

interface FormsListProps {
  forms: FormDefinition[];
  onEdit: (form: FormDefinition) => void;
  onDelete: (form: FormDefinition) => void;
}

const MotionBox = motion.create(Box);

const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25, ease: "easeOut" } },
};

export default function FormsList({ forms, onEdit, onDelete }: FormsListProps) {
  const { showToast } = useToast();
  const [emailTarget, setEmailTarget] = useState<FormDefinition | null>(null);

  const copyLink = async (link: string) => {
    try {
      await navigator.clipboard.writeText(link);
      showToast("Link copied", "success");
    } catch {
      showToast("Couldn't copy link", "error");
    }
  };

  if (forms.length === 0) {
    return (
      <Box
        sx={{
          border: "1px dashed #E0E0E0",
          borderRadius: "12px",
          py: 6,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 1,
        }}
      >
        <DescriptionOutlinedIcon sx={{ fontSize: 28, color: "#C0C0C0" }} />
        <Typography sx={{ fontSize: 13, color: "#8A8A8A" }}>
          No forms yet — create one to start capturing leads.
        </Typography>
      </Box>
    );
  }

  return (
    <MotionBox
      variants={containerVariants}
      initial="hidden"
      animate="show"
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
        gap: 1.5,
      }}
    >
      {forms.map((form) => (
        <MotionBox
          key={form.id}
          variants={cardVariants}
          sx={{
            border: "1px solid #E0E0E0",
            borderRadius: "12px",
            bgcolor: "#fff",
            p: 2,
            display: "flex",
            flexDirection: "column",
            gap: 1,
          }}
        >
          <Typography sx={{ fontSize: 14, fontWeight: 700, color: "#1A1A1A" }}>
            {form.name}
          </Typography>
          {form.description && (
            <Typography sx={{ fontSize: 12, color: "#8A8A8A" }}>
              {form.description}
            </Typography>
          )}
          <Typography sx={{ fontSize: 11.5, color: "#8A8A8A" }}>
            {form.fields.length} field{form.fields.length === 1 ? "" : "s"}
          </Typography>

          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              justifyContent: "flex-end",
              gap: 0.25,
              mt: "auto",
              pt: 1,
              borderTop: "1px solid #F5F5F5",
            }}
          >
            <Tooltip title="Copy public link">
              <span>
                <IconButton
                  size="small"
                  disabled={!form.link}
                  onClick={() => form.link && copyLink(form.link)}
                >
                  <LinkOutlinedIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Send by email">
              <span>
                <IconButton
                  size="small"
                  disabled={!form.link}
                  onClick={() => setEmailTarget(form)}
                >
                  <MailOutlineIcon sx={{ fontSize: 16 }} />
                </IconButton>
              </span>
            </Tooltip>
            <Tooltip title="Edit">
              <IconButton size="small" onClick={() => onEdit(form)}>
                <EditOutlinedIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </Tooltip>
            <Tooltip title="Delete">
              <IconButton size="small" onClick={() => onDelete(form)}>
                <DeleteOutlineIcon sx={{ fontSize: 16, color: "#B23A3A" }} />
              </IconButton>
            </Tooltip>
          </Box>
        </MotionBox>
      ))}

      {emailTarget && emailTarget.link && (
        <SendFormEmailDialog
          formId={emailTarget.id}
          formName={emailTarget.name}
          formLink={emailTarget.link}
          onClose={() => setEmailTarget(null)}
        />
      )}
    </MotionBox>
  );
}
