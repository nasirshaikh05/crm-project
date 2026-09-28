"use client";

import React, { useState } from "react";
import { Box, Typography, Menu, MenuItem, Divider, TextField, IconButton } from "@mui/material";
import { motion, AnimatePresence, type Variants } from "framer-motion";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import AddIcon from "@mui/icons-material/Add";
import CheckIcon from "@mui/icons-material/Check";
import CloseIcon from "@mui/icons-material/Close";
import CircularProgress from "@mui/material/CircularProgress";

const MotionMenuItem = motion.create(MenuItem);

interface AnimatedDropdownProps {
  label: string;
  value: string;
  options: string[];
  placeholder?: string;
  disabled?: boolean;
  disabledHint?: string;
  loading?: boolean;
  addNewLabel?: string;
  onChange: (value: string) => void;
  onAddNew?: (value: string) => void | Promise<unknown>;
}

const menuVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.03 } },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -6 },
  show: { opacity: 1, x: 0, transition: { duration: 0.15 } },
};

export default function AnimatedDropdown({
  label,
  value,
  options,
  placeholder = "Select…",
  disabled,
  disabledHint,
  loading,
  addNewLabel = "Add new",
  onChange,
  onAddNew,
}: AnimatedDropdownProps) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState("");
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const isDisabled = disabled || loading;

  const close = () => {
    setAnchorEl(null);
    setAdding(false);
    setDraft("");
    setAddError(null);
  };

  const confirmAdd = async () => {
    const trimmed = draft.trim();
    if (!trimmed) return;
    setAddSaving(true);
    setAddError(null);
    try {
      await onAddNew?.(trimmed);
      onChange(trimmed);
      close();
    } catch (err) {
      setAddError((err as { message?: string }).message ?? "Failed to add");
    } finally {
      setAddSaving(false);
    }
  };

  return (
    <Box sx={{ mb: 1.5 }}>
      <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#8A8A8A", mb: 0.5 }}>
        {label}
      </Typography>

      <motion.div
        whileHover={isDisabled ? undefined : { y: -1 }}
        whileTap={isDisabled ? undefined : { scale: 0.98 }}
      >
        <Box
          onClick={(e) => !isDisabled && setAnchorEl(e.currentTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            border: "1px solid #E0E0E0",
            borderRadius: "8px",
            px: 1.25,
            py: 0.85,
            fontSize: 12.5,
            cursor: isDisabled ? "not-allowed" : "pointer",
            bgcolor: isDisabled ? "#FAFAFA" : "#fff",
            color: value ? "#1A1A1A" : "#B0B0B0",
            transition: "border-color .15s ease",
            "&:hover": isDisabled ? {} : { borderColor: "#1A73E8" },
          }}
        >
          {loading ? "Loading…" : value || (disabled ? (disabledHint ?? placeholder) : placeholder)}
          {loading ? (
            <CircularProgress size={13} />
          ) : (
            <KeyboardArrowDownIcon sx={{ fontSize: 18, color: "#8A8A8A" }} />
          )}
        </Box>
      </motion.div>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={close}
        slotProps={{
          paper: {
            sx: {
              minWidth: 220,
              borderRadius: "10px",
              border: "1px solid #E0E0E0",
              boxShadow: "0 12px 30px rgba(0,0,0,0.08)",
              mt: 0.5,
            },
          },
        }}
      >
        <motion.div variants={menuVariants} initial="hidden" animate="show">
          {options.length === 0 && (
            <Typography sx={{ px: 2, py: 1, fontSize: 12, color: "#B0B0B0" }}>
              No options yet
            </Typography>
          )}

          {options.map((opt) => (
            <MotionMenuItem
              key={opt}
              variants={itemVariants}
              selected={opt === value}
              onClick={() => {
                onChange(opt);
                close();
              }}
              sx={{
                fontSize: 12.5,
                fontWeight: opt === value ? 700 : 500,
                color: opt === value ? "#1A73E8" : "#1A1A1A",
                transition: "transform .12s ease",
                "&:hover": { transform: "translateX(3px)" },
              }}
            >
              {opt}
            </MotionMenuItem>
          ))}

          {onAddNew && (
            <>
              <Divider sx={{ my: 0.5 }} />
              <AnimatePresence mode="wait" initial={false}>
                {adding ? (
                  <motion.div
                    key="adding"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    style={{ overflow: "hidden" }}
                  >
                    <Box sx={{ px: 1.5, py: 0.75 }}>
                      <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                        <TextField
                          autoFocus
                          size="small"
                          disabled={addSaving}
                          placeholder={addNewLabel}
                          value={draft}
                          onChange={(e) => setDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmAdd();
                            if (e.key === "Escape") setAdding(false);
                          }}
                          sx={{
                            "& .MuiOutlinedInput-root": {
                              fontSize: 12.5,
                              borderRadius: "6px",
                            },
                          }}
                        />
                        {addSaving ? (
                          <CircularProgress size={16} sx={{ mx: 0.75 }} />
                        ) : (
                          <IconButton size="small" onClick={confirmAdd} sx={{ color: "#1A73E8" }}>
                            <CheckIcon sx={{ fontSize: 16 }} />
                          </IconButton>
                        )}
                        <IconButton
                          size="small"
                          disabled={addSaving}
                          onClick={() => setAdding(false)}
                          sx={{ color: "#B0B0B0" }}
                        >
                          <CloseIcon sx={{ fontSize: 16 }} />
                        </IconButton>
                      </Box>
                      {addError && (
                        <Typography sx={{ fontSize: 11, color: "#B23A3A", mt: 0.5 }}>
                          {addError}
                        </Typography>
                      )}
                    </Box>
                  </motion.div>
                ) : (
                  <MotionMenuItem
                    key="trigger"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={() => setAdding(true)}
                    sx={{
                      fontSize: 12.5,
                      fontWeight: 600,
                      color: "#1A73E8",
                      display: "flex",
                      gap: 0.75,
                      transition: "transform .12s ease",
                      "&:hover": { transform: "translateX(3px)" },
                    }}
                  >
                    <AddIcon sx={{ fontSize: 16 }} />
                    {addNewLabel}
                  </MotionMenuItem>
                )}
              </AnimatePresence>
            </>
          )}
        </motion.div>
      </Menu>
    </Box>
  );
}
