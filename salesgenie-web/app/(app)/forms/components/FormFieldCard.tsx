"use client";

import React, { useState } from "react";
import {
  Box,
  TextField,
  MenuItem,
  Switch,
  IconButton,
  Radio,
} from "@mui/material";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import CloseIcon from "@mui/icons-material/Close";

import type { FormFieldDef } from "@/app/lib/forms/types";

const compactFieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 12.5 },
};

interface FormFieldCardProps {
  field: FormFieldDef;
  /** The very first field can't join a row above it — there isn't one. */
  isFirst: boolean;
  accentColor: string;
  onChange: (patch: Partial<FormFieldDef>) => void;
  onRemove: () => void;
}

export default function FormFieldCard({
  field,
  isFirst,
  accentColor,
  onChange,
  onRemove,
}: FormFieldCardProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: field.id });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    width: "100%",
  };

  const hasOptions = field.type === "select" || field.type === "radio";

  // Local draft so the raw text being typed (e.g. a trailing "Yes,") isn't
  // immediately collapsed back to "Yes" by re-deriving the value from the
  // parsed/filtered options on every keystroke.
  const [optionsDraft, setOptionsDraft] = useState(
    (field.options ?? []).map((o) => o.label).join(", "),
  );

  return (
    <Box
      ref={setNodeRef}
      style={style}
      sx={{
        borderRadius: "10px",
        border: "1px dashed transparent",
        "&:hover": { border: "1px dashed #D0D0D0", bgcolor: "#FAFBFE" },
        p: 1.5,
        display: "flex",
        gap: 1,
      }}
    >
      <Box
        {...attributes}
        {...listeners}
        sx={{
          cursor: "grab",
          color: "#C0C0C0",
          display: "flex",
          alignItems: "flex-start",
          pt: 0.5,
          touchAction: "none",
        }}
      >
        <DragIndicatorIcon sx={{ fontSize: 18 }} />
      </Box>

      <Box sx={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 0.75 }}>
        <TextField
          variant="standard"
          fullWidth
          placeholder="Question"
          value={field.label}
          onChange={(e) => onChange({ label: e.target.value })}
          sx={{
            "& .MuiInput-input": { fontSize: 14, fontWeight: 600, color: "#1A1A1A" },
          }}
        />

        {/* Read-only preview of the input this field renders as */}
        <Box sx={{ pointerEvents: "none", opacity: 0.6 }}>
          {field.type === "textarea" ? (
            <TextField fullWidth multiline minRows={2} size="small" disabled sx={compactFieldSx} />
          ) : field.type === "select" ? (
            <TextField select fullWidth size="small" disabled value="" sx={compactFieldSx}>
              {(field.options ?? []).map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </TextField>
          ) : field.type === "radio" ? (
            <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1.5 }}>
              {(field.options ?? []).map((opt) => (
                <Box key={opt.value} sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
                  <Radio size="small" disabled sx={{ p: 0.5 }} />
                  <Box component="span" sx={{ fontSize: 12.5, color: "#5A5A5A" }}>
                    {opt.label}
                  </Box>
                </Box>
              ))}
            </Box>
          ) : field.type === "checkbox" ? (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
              <input type="checkbox" disabled />
              <Box component="span" sx={{ fontSize: 12.5, color: "#5A5A5A" }}>
                Yes
              </Box>
            </Box>
          ) : field.type === "date" ? (
            <TextField type="date" fullWidth size="small" disabled sx={compactFieldSx} />
          ) : (
            <TextField fullWidth size="small" disabled sx={compactFieldSx} />
          )}
        </Box>

        {hasOptions && (
          <TextField
            size="small"
            fullWidth
            placeholder="Options, comma separated (e.g. Small, Medium, Large)"
            value={optionsDraft}
            onChange={(e) => {
              const raw = e.target.value;
              setOptionsDraft(raw);
              onChange({
                options: raw
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
                  .map((s) => ({ label: s, value: s })),
              });
            }}
            sx={compactFieldSx}
          />
        )}

        <Box sx={{ display: "flex", alignItems: "center", flexWrap: "wrap", gap: 1.5 }}>
          {!isFirst && (
            <Box sx={{ display: "flex", alignItems: "center", gap: 0.25 }}>
              <Switch
                size="small"
                checked={field.newRow === false}
                onChange={(e) => onChange({ newRow: e.target.checked ? false : true })}
                sx={{
                  "& .Mui-checked": { color: accentColor },
                  "& .Mui-checked + .MuiSwitch-track": { bgcolor: accentColor },
                }}
              />
              <Box component="span" sx={{ fontSize: 11.5, color: "#5A5A5A" }}>
                Same row as previous
              </Box>
            </Box>
          )}

          <Box sx={{ display: "flex", alignItems: "center", gap: 0.25, ml: "auto" }}>
            <Box component="span" sx={{ fontSize: 12, color: "#5A5A5A" }}>
              Required
            </Box>
            <Switch
              size="small"
              checked={field.required}
              disabled={Boolean(field.key)}
              onChange={(e) => onChange({ required: e.target.checked })}
              sx={{
                "& .Mui-checked": { color: accentColor },
                "& .Mui-checked + .MuiSwitch-track": { bgcolor: accentColor },
              }}
            />
            <IconButton size="small" onClick={onRemove}>
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        </Box>

      </Box>
    </Box>
  );
}
