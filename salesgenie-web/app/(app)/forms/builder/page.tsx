"use client";

import React, { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Box,
  Typography,
  Button,
  TextField,
  IconButton,
  CircularProgress,
  ToggleButton,
  ToggleButtonGroup,
} from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import {
  DndContext,
  type DragEndEvent,
  PointerSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy } from "@dnd-kit/sortable";

import FormFieldCard from "../components/FormFieldCard";
import { useForms } from "@/app/lib/hooks/useForms";
import { useToast } from "@/app/components/ToastProvider";
import { groupFieldsIntoRows } from "@/app/lib/forms/rows";
import {
  DEFAULT_FORM_THEME,
  type FormFieldDef,
  type FormFieldOption,
  type FormFieldType,
  type FormTheme,
  type WellKnownFieldKey,
} from "@/app/lib/forms/types";

interface PaletteEntry {
  id: string;
  key?: WellKnownFieldKey;
  label: string;
  type: FormFieldType;
  /** Pre-filled options, e.g. the Yes/No shortcut for a 2-option radio. */
  presetOptions?: FormFieldOption[];
}

// const YES_NO_OPTIONS: FormFieldOption[] = [
//   { label: "Yes", value: "yes" },
//   { label: "No", value: "no" },
// ];

// Choice/Text/Others categories and the Address/Website fields are hidden
// for now — not ready to expose to users yet.
const PALETTE_CATEGORIES: { title: string; items: PaletteEntry[] }[] = [
  {
    title: "Contact info",
    items: [
      { id: "palette:firstName", key: "firstName", label: "First name", type: "text" },
      { id: "palette:lastName", key: "lastName", label: "Last name", type: "text" },
      { id: "palette:email", key: "email", label: "Email", type: "email" },
      { id: "palette:phoneNumber", key: "phoneNumber", label: "Phone number", type: "phone" },
      { id: "palette:suburb", key: "suburb", label: "Suburb", type: "text" },
      { id: "palette:state", key: "state", label: "State", type: "text" },
      { id: "palette:postcode", key: "postcode", label: "Postcode", type: "text" },
      // { id: "palette:address", label: "Address", type: "text" },
      // { id: "palette:website", label: "Website link", type: "text" },
    ],
  },
  // {
  //   title: "Choice",
  //   items: [
  //     { id: "palette:select", label: "Dropdown", type: "select" },
  //     { id: "palette:radio", label: "Radio", type: "radio" },
  //     { id: "palette:checkbox", label: "Checkbox", type: "checkbox" },
  //     { id: "palette:yesno", label: "Yes / No", type: "radio", presetOptions: YES_NO_OPTIONS },
  //   ],
  // },
  // {
  //   title: "Text",
  //   items: [
  //     { id: "palette:text", label: "Short text", type: "text" },
  //     { id: "palette:textarea", label: "Long text", type: "textarea" },
  //   ],
  // },
  // {
  //   title: "Others",
  //   items: [{ id: "palette:date", label: "Date", type: "date" }],
  // },
];

function PaletteItem({ item, disabled }: { item: PaletteEntry; disabled: boolean }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: item.id,
    data: item,
    disabled,
  });

  return (
    <Box
      ref={setNodeRef}
      {...attributes}
      {...listeners}
      sx={{
        px: 1.5,
        py: 1,
        borderRadius: "8px",
        border: "1px solid #E0E0E0",
        bgcolor: disabled ? "#F5F5F5" : "#fff",
        color: disabled ? "#B0B0B0" : "#1A1A1A",
        fontSize: 12.5,
        fontWeight: 600,
        cursor: disabled ? "not-allowed" : "grab",
        opacity: isDragging ? 0.4 : 1,
        touchAction: "none",
        userSelect: "none",
      }}
    >
      {item.label}
    </Box>
  );
}

function Canvas({ children }: { children: React.ReactNode }) {
  const { setNodeRef } = useDroppable({ id: "canvas" });
  return (
    <Box ref={setNodeRef} sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
      {children}
    </Box>
  );
}

function BuilderContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const editingId = searchParams.get("id");
  const { showToast } = useToast();
  const { forms, loading, createForm, updateForm } = useForms();

  const editingForm = editingId ? (forms.find((f) => f.id === editingId) ?? null) : null;

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [theme, setTheme] = useState<FormTheme>(DEFAULT_FORM_THEME);
  const [fields, setFields] = useState<FormFieldDef[]>([]);
  const [saving, setSaving] = useState(false);

  // Load the working draft once the form list has resolved — adjusting
  // state during render, same "reset on dependency change" pattern used
  // elsewhere in this app (e.g. StepPanel's trackedLeadId).
  const initKey = loading ? null : (editingId ?? "new");
  const [trackedInitKey, setTrackedInitKey] = useState<string | null>(null);
  if (initKey !== null && initKey !== trackedInitKey) {
    setTrackedInitKey(initKey);
    if (editingForm) {
      setName(editingForm.name);
      setDescription(editingForm.description);
      setTheme(editingForm.theme);
      setFields(editingForm.fields);
    } else {
      setName("");
      setDescription("");
      setTheme(DEFAULT_FORM_THEME);
      setFields([]);
    }
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
  );

  const usedKeys = new Set(fields.map((f) => f.key).filter(Boolean));

  const updateField = (id: string, patch: Partial<FormFieldDef>) => {
    setFields((prev) => prev.map((f) => (f.id === id ? { ...f, ...patch } : f)));
  };

  const removeField = (id: string) => {
    setFields((prev) => prev.filter((f) => f.id !== id));
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId.startsWith("palette:")) {
      const item = active.data.current as PaletteEntry | undefined;
      if (!item || (item.key && usedKeys.has(item.key))) return;

      const newField: FormFieldDef = {
        id: crypto.randomUUID(),
        key: item.key,
        label: item.label,
        type: item.type,
        required: true,
        options: item.presetOptions,
      };

      setFields((prev) => {
        if (overId === "canvas") return [...prev, newField];
        const overIndex = prev.findIndex((f) => f.id === overId);
        if (overIndex === -1) return [...prev, newField];
        const next = [...prev];
        next.splice(overIndex, 0, newField);
        return next;
      });
      return;
    }

    if (activeId !== overId) {
      setFields((prev) => {
        const oldIndex = prev.findIndex((f) => f.id === activeId);
        const newIndex = prev.findIndex((f) => f.id === overId);
        if (oldIndex === -1 || newIndex === -1) return prev;
        return arrayMove(prev, oldIndex, newIndex);
      });
    }
  };

  const canSave =
    name.trim().length > 0 &&
    fields.length > 0 &&
    fields.every((f) => f.label.trim().length > 0);

  const handleSave = async () => {
    if (!canSave) return;
    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim(),
        theme,
        fields: fields.map((f) => ({
          id: f.id,
          key: f.key,
          label: f.label,
          type: f.type,
          required: f.required,
          newRow: f.newRow,
          placeholder: f.placeholder,
          options: f.options,
        })),
      };
      if (editingForm) {
        await updateForm(editingForm.id, payload);
        showToast("Form updated", "success");
      } else {
        await createForm(payload);
        showToast("Form created", "success");
      }
      router.push("/forms");
    } catch {
      showToast("Failed to save form", "error");
    } finally {
      setSaving(false);
    }
  };

  if (editingId && loading) {
    return (
      <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
        <CircularProgress size={26} />
      </Box>
    );
  }

  const rows = groupFieldsIntoRows(fields);

  return (
    <DndContext sensors={sensors} onDragEnd={handleDragEnd}>
      <Box sx={{ maxWidth: 1200, mx: "auto" }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 2.5 }}>
          <IconButton size="small" onClick={() => router.push("/forms")}>
            <ArrowBackIcon sx={{ fontSize: 18 }} />
          </IconButton>
          <Typography sx={{ fontSize: 18, fontWeight: 800, color: "#1A1A1A" }}>
            {editingForm ? "Edit form" : "New form"}
          </Typography>
          <Button
            onClick={handleSave}
            disabled={!canSave || saving}
            variant="contained"
            sx={{
              ml: "auto",
              textTransform: "none",
              fontWeight: 700,
              fontSize: 12.5,
              boxShadow: "none",
              bgcolor: "#1A73E8",
              "&:hover": { bgcolor: "#1660C4", boxShadow: "none" },
            }}
          >
            {saving ? <CircularProgress size={16} sx={{ color: "#fff" }} /> : "Save"}
          </Button>
        </Box>

        <Box sx={{ display: "flex", gap: 2.5, alignItems: "flex-start" }}>
          {/* Left: palette + theme */}
          <Box
            sx={{
              width: 260,
              flexShrink: 0,
              display: "flex",
              flexDirection: "column",
              gap: 2,
              position: "sticky",
              top: 12,
            }}
          >
            {PALETTE_CATEGORIES.map((category) => (
              <Box key={category.title}>
                <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#8A8A8A", mb: 1, textTransform: "uppercase" }}>
                  {category.title}
                </Typography>
                <Box sx={{ display: "flex", flexDirection: "column", gap: 0.75 }}>
                  {category.items.map((item) => (
                    <PaletteItem
                      key={item.id}
                      item={item}
                      disabled={Boolean(item.key && usedKeys.has(item.key))}
                    />
                  ))}
                </Box>
              </Box>
            ))}

            <Box>
              <Typography sx={{ fontSize: 11, fontWeight: 700, color: "#8A8A8A", mb: 1, textTransform: "uppercase" }}>
                Design
              </Typography>
              <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <input
                    type="color"
                    value={theme.accentColor}
                    onChange={(e) => setTheme((t) => ({ ...t, accentColor: e.target.value }))}
                    style={{ width: 32, height: 32, border: "none", background: "none", cursor: "pointer" }}
                  />
                  <Typography sx={{ fontSize: 12, color: "#5A5A5A" }}>Accent color</Typography>
                </Box>
                <TextField
                  size="small"
                  placeholder="Logo URL (optional)"
                  value={theme.logoUrl ?? ""}
                  onChange={(e) => setTheme((t) => ({ ...t, logoUrl: e.target.value }))}
                  sx={{ "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 12.5 } }}
                />
                <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                  <Typography sx={{ fontSize: 12, color: "#5A5A5A" }}>Title align</Typography>
                  <ToggleButtonGroup
                    size="small"
                    exclusive
                    value={theme.titleAlign}
                    onChange={(_, next: "left" | "center" | null) =>
                      next && setTheme((t) => ({ ...t, titleAlign: next }))
                    }
                    sx={{
                      "& .MuiToggleButton-root": { textTransform: "none", fontSize: 11.5, px: 1, py: 0.25 },
                    }}
                  >
                    <ToggleButton value="left">Left</ToggleButton>
                    <ToggleButton value="center">Center</ToggleButton>
                  </ToggleButtonGroup>
                </Box>
              </Box>
            </Box>
          </Box>

          {/* Right: live preview / canvas — one unified card, same look as the public page */}
          <Box
            sx={{
              flex: 1,
              bgcolor: "#fff",
              borderRadius: "16px",
              border: "1px solid #E5E5E5",
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                bgcolor: theme.accentColor,
                px: 4,
                py: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: theme.titleAlign === "left" ? "flex-start" : "center",
              }}
            >
              {theme.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={theme.logoUrl} alt="" style={{ height: 36, marginBottom: 12 }} />
              )}
              <TextField
                variant="standard"
                fullWidth
                placeholder="Form name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                slotProps={{ input: { disableUnderline: true, sx: { textAlign: theme.titleAlign } } }}
                sx={{
                  "& .MuiInput-input": {
                    fontSize: 24,
                    fontWeight: 800,
                    color: "#fff",
                    textAlign: theme.titleAlign,
                    "&::placeholder": { color: "rgba(255,255,255,0.7)", opacity: 1 },
                  },
                }}
              />
              <TextField
                variant="standard"
                fullWidth
                placeholder="Description (optional)"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                slotProps={{ input: { disableUnderline: true, sx: { textAlign: theme.titleAlign } } }}
                sx={{
                  mt: 0.5,
                  "& .MuiInput-input": {
                    fontSize: 13,
                    color: "rgba(255,255,255,0.85)",
                    textAlign: theme.titleAlign,
                    "&::placeholder": { color: "rgba(255,255,255,0.6)", opacity: 1 },
                  },
                }}
              />
            </Box>

            <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 2.5 }}>
              <SortableContext items={fields.map((f) => f.id)} strategy={rectSortingStrategy}>
                <Canvas>
                  {rows.map((row) => (
                    <Box
                      key={row.map((f) => f.id).join("-")}
                      sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}
                    >
                      {row.map((field) => (
                        <Box key={field.id} sx={{ flex: 1, minWidth: 0 }}>
                          <FormFieldCard
                            field={field}
                            isFirst={fields[0]?.id === field.id}
                            accentColor={theme.accentColor}
                            onChange={(patch) => updateField(field.id, patch)}
                            onRemove={() => removeField(field.id)}
                          />
                        </Box>
                      ))}
                    </Box>
                  ))}
                  {fields.length === 0 && (
                    <Box
                      sx={{
                        border: "1px dashed #E0E0E0",
                        borderRadius: "10px",
                        py: 5,
                        textAlign: "center",
                        color: "#8A8A8A",
                        fontSize: 12.5,
                      }}
                    >
                      Drag a field here to get started
                    </Box>
                  )}
                </Canvas>
              </SortableContext>

              <Button
                disabled
                fullWidth
                variant="contained"
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  py: 1.1,
                  borderRadius: "10px",
                  boxShadow: "none",
                  bgcolor: theme.accentColor,
                  "&.Mui-disabled": { bgcolor: theme.accentColor, opacity: 0.5, color: "#fff" },
                }}
              >
                Submit
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
    </DndContext>
  );
}

export default function FormBuilderPage() {
  return (
    <Suspense fallback={<Box sx={{ display: "flex", justifyContent: "center", py: 8 }}><CircularProgress size={26} /></Box>}>
      <BuilderContent />
    </Suspense>
  );
}
