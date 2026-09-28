"use client";

import React, { useState } from "react";
import {
  Box,
  Typography,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Avatar,
  CircularProgress,
  IconButton,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import PhotoCameraOutlinedIcon from "@mui/icons-material/PhotoCameraOutlined";

import { useToast } from "@/app/components/ToastProvider";
import type { Workspace } from "@/app/lib/api/types";

interface WorkspaceSettingsDialogProps {
  workspace: Workspace;
  onClose: () => void;
  onUpdateName: (id: string, name: string) => Promise<Workspace>;
  onUploadLogo: (id: string, file: File) => Promise<Workspace>;
}

export default function WorkspaceSettingsDialog({
  workspace,
  onClose,
  onUpdateName,
  onUploadLogo,
}: WorkspaceSettingsDialogProps) {
  const { showToast } = useToast();
  const [name, setName] = useState(workspace.name);
  const [logoUrl, setLogoUrl] = useState(workspace.logoUrl ?? null);
  const [savingName, setSavingName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const handleSaveName = async () => {
    const trimmed = name.trim();
    if (!trimmed || trimmed === workspace.name) return;
    setSavingName(true);
    try {
      await onUpdateName(workspace.id, trimmed);
      showToast("Workspace name updated", "success");
    } catch (err) {
      showToast(
        (err as { message?: string }).message ?? "Failed to update name",
        "error",
      );
    } finally {
      setSavingName(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploadingLogo(true);
    try {
      const updated = await onUploadLogo(workspace.id, file);
      setLogoUrl(updated.logoUrl ?? null);
      showToast("Logo updated", "success");
    } catch (err) {
      showToast(
        (err as { message?: string }).message ?? "Failed to upload logo",
        "error",
      );
    } finally {
      setUploadingLogo(false);
    }
  };

  return (
    <Dialog
      open
      onClose={onClose}
      maxWidth="xs"
      fullWidth
      slotProps={{ paper: { sx: { borderRadius: "14px" } } }}
    >
      <DialogTitle
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 16,
          fontWeight: 800,
        }}
      >
        Workspace settings
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>

      <DialogContent sx={{ display: "flex", flexDirection: "column", gap: 2.5 }}>
        {/* Logo */}
        <Box sx={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 1 }}>
          <Box sx={{ position: "relative" }}>
            <Avatar
              src={logoUrl ?? undefined}
              sx={{
                width: 72,
                height: 72,
                fontSize: 22,
                fontWeight: 700,
                bgcolor: "#EAF2FE",
                color: "#1A73E8",
              }}
            >
              {!logoUrl && workspace.name[0]?.toUpperCase()}
            </Avatar>
            <IconButton
              component="label"
              size="small"
              disabled={uploadingLogo}
              sx={{
                position: "absolute",
                bottom: -4,
                right: -4,
                bgcolor: "#1A73E8",
                color: "#fff",
                border: "2px solid #fff",
                "&:hover": { bgcolor: "#1660C4" },
              }}
            >
              {uploadingLogo ? (
                <CircularProgress size={14} sx={{ color: "#fff" }} />
              ) : (
                <PhotoCameraOutlinedIcon sx={{ fontSize: 14 }} />
              )}
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={handleLogoChange}
              />
            </IconButton>
          </Box>
          <Typography sx={{ fontSize: 11.5, color: "#8A8A8A" }}>
            Click the camera icon to upload a logo
          </Typography>
        </Box>

        {/* Name */}
        <Box>
          <Typography sx={{ fontSize: 12, fontWeight: 700, color: "#5A5A5A", mb: 0.75 }}>
            Workspace name
          </Typography>
          <Box sx={{ display: "flex", gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSaveName();
              }}
              sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px" } }}
            />
            <Button
              onClick={handleSaveName}
              disabled={
                !name.trim() || name.trim() === workspace.name || savingName
              }
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
              {savingName ? (
                <CircularProgress size={16} sx={{ color: "#fff" }} />
              ) : (
                "Save"
              )}
            </Button>
          </Box>
        </Box>
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5 }}>
        <Button
          onClick={onClose}
          sx={{ textTransform: "none", fontWeight: 600, color: "#5A5A5A" }}
        >
          Done
        </Button>
      </DialogActions>
    </Dialog>
  );
}
