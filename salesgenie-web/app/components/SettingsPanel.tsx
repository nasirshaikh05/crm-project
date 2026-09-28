"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  TextField,
  Avatar,
  IconButton,
  Drawer,
  CircularProgress,
} from "@mui/material";
import { motion } from "framer-motion";
import CloseIcon from "@mui/icons-material/Close";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";

import { useCurrentUser } from "@/app/lib/hooks/useCurrentUser";
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

interface SettingsPanelProps {
  open: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ open, onClose }: SettingsPanelProps) {
  const { showToast } = useToast();
  const { profile, loading, error, updateProfile } = useCurrentUser(open);

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  // Resets the profile draft whenever a fresh `profile` object arrives —
  // same "reset on fresh data" pattern used in the Lead/Customer details pages.
  const [trackedProfileId, setTrackedProfileId] = useState<string | null>(null);
  if (profile && trackedProfileId !== profile.id + profile.updatedAt) {
    setTrackedProfileId(profile.id + profile.updatedAt);
    setFirstName(profile.firstName ?? "");
    setLastName(profile.lastName ?? "");
    setEmail(profile.email);
  }

  const canSaveProfile = Boolean(email.trim());

  const handleSaveProfile = async () => {
    if (!canSaveProfile) return;
    setSavingProfile(true);
    try {
      await updateProfile({
        firstName: firstName.trim() || undefined,
        lastName: lastName.trim() || undefined,
        email: email.trim(),
      });
      showToast("Profile updated", "success");
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to update profile", "error");
    } finally {
      setSavingProfile(false);
    }
  };

  const initials =
    [firstName[0], lastName[0]].filter(Boolean).join("").toUpperCase() ||
    profile?.email[0]?.toUpperCase() ||
    "U";

  return (
    <Drawer
      anchor="right"
      open={open}
      onClose={onClose}
      slotProps={{
        paper: {
          sx: {
            width: 420,
            maxWidth: "100vw",
            borderRadius: "16px 0 0 16px",
            p: 3,
          },
        },
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.25, mb: 2.5 }}>
        {profile && (
          <Avatar
            sx={{
              width: 40,
              height: 40,
              fontSize: 14,
              fontWeight: 700,
              bgcolor: colorForId(profile.id),
              color: "#1A1A1A",
            }}
          >
            {initials}
          </Avatar>
        )}
        <Box sx={{ flex: 1 }}>
          <Typography sx={{ fontSize: 16, fontWeight: 800, color: "#1A1A1A" }}>
            Settings
          </Typography>
          <Typography sx={{ fontSize: 12, color: "#8A8A8A" }}>
            Account settings
          </Typography>
        </Box>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </Box>

      {loading && !profile ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
          <CircularProgress size={26} />
        </Box>
      ) : !profile ? (
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
          {error ?? "Couldn't load your profile."}
        </Box>
      ) : (
        <Box sx={{ display: "flex", flexDirection: "column", gap: 2 }}>
          {/* Profile */}
          <Box
            sx={{
              border: "1px solid #E0E0E0",
              borderRadius: "12px",
              bgcolor: "#fff",
              p: 2.25,
              display: "flex",
              flexDirection: "column",
              gap: 1.75,
            }}
          >
            <Typography sx={{ fontSize: 13, fontWeight: 700, color: "#1A1A1A" }}>
              Profile
            </Typography>

            <Box sx={{ display: "flex", gap: 1.25 }}>
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

            <Box sx={{ display: "flex", justifyContent: "flex-end" }}>
              <MotionButton
                whileHover={canSaveProfile ? { scale: 1.03 } : undefined}
                whileTap={canSaveProfile ? { scale: 0.97 } : undefined}
                startIcon={
                  savingProfile ? (
                    <CircularProgress size={14} sx={{ color: "#fff" }} />
                  ) : (
                    <SaveOutlinedIcon sx={{ fontSize: 16 }} />
                  )
                }
                onClick={handleSaveProfile}
                disabled={!canSaveProfile || savingProfile}
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
        </Box>
      )}
    </Drawer>
  );
}
