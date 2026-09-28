"use client";

import React from "react";
import { useRouter } from "next/navigation";
import { Box, Typography, Button, CircularProgress } from "@mui/material";
import { motion } from "framer-motion";
import AddIcon from "@mui/icons-material/Add";

import FormsList from "./components/FormsList";
import { useForms } from "@/app/lib/hooks/useForms";
import { useToast } from "@/app/components/ToastProvider";
import type { FormDefinition } from "@/app/lib/forms/types";

const MotionButton = motion.create(Button);

export default function FormsPage() {
  const router = useRouter();
  const { showToast } = useToast();
  const { forms, loading, deleteForm } = useForms();

  const handleDelete = async (form: FormDefinition) => {
    if (!window.confirm(`Delete "${form.name}"? This can't be undone.`)) return;
    try {
      await deleteForm(form.id);
      showToast("Form deleted", "success");
    } catch {
      showToast("Failed to delete form", "error");
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <Box sx={{ maxWidth: 1440, mx: "auto" }}>
        <Box
          sx={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            mb: 2.5,
          }}
        >
          <Box>
            <Typography sx={{ fontSize: 22, fontWeight: 800, color: "#1A1A1A" }}>
              Forms
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "#8A8A8A" }}>
              Eziyo / Forms
            </Typography>
          </Box>

          <MotionButton
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            startIcon={<AddIcon sx={{ fontSize: 17 }} />}
            variant="contained"
            onClick={() => router.push("/forms/builder")}
            sx={{
              textTransform: "none",
              fontWeight: 700,
              fontSize: 13,
              borderRadius: "8px",
              boxShadow: "none",
              bgcolor: "#1A73E8",
              "&:hover": { bgcolor: "#1660C4", boxShadow: "none" },
            }}
          >
            Create form
          </MotionButton>
        </Box>

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 6 }}>
            <CircularProgress size={28} />
          </Box>
        ) : (
          <FormsList
            forms={forms}
            onEdit={(form) => router.push(`/forms/builder?id=${form.id}`)}
            onDelete={handleDelete}
          />
        )}
      </Box>
    </motion.div>
  );
}
