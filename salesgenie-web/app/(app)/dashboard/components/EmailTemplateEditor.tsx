"use client";

import { useState, type ChangeEvent } from "react";
import {
  Box,
  Typography,
  IconButton,
  TextField,
  Button,
  Menu,
  MenuItem,
  Select,
  Divider,
  CircularProgress,
  Tooltip,
} from "@mui/material";
import { motion, type Variants } from "framer-motion";

import RichTextEditor from "@/app/components/RichTextEditor";
import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import ChevronRightIcon from "@mui/icons-material/ChevronRight";
import CloseIcon from "@mui/icons-material/Close";
import SendOutlinedIcon from "@mui/icons-material/SendOutlined";
import SaveOutlinedIcon from "@mui/icons-material/SaveOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import InsertDriveFileOutlinedIcon from "@mui/icons-material/InsertDriveFileOutlined";
import VideocamOutlinedIcon from "@mui/icons-material/VideocamOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";

import { stagesApi, storageApi, type ApiError } from "@/app/lib/api";
import { useToast } from "@/app/components/ToastProvider";
import { useForms } from "@/app/lib/hooks/useForms";
import type { Queue, Stage } from "@/app/lib/api/types";
import type {
  EmailActionButton,
  EmailTemplate,
} from "../type";

// Matches any link the editor previously inserted for a form — used so
// picking a different form swaps the link instead of piling up duplicates,
// and so the dropdown can tell which form (if any) is already inserted.
// Matched on the data-form-id attribute (see RichTextEditor's FormLink
// extension) rather than the href, since the href is now the backend's
// opaque /pwa/<token> share link — the form's real id isn't recoverable
// from it client-side.
const FORM_LINK_REGEX = /<a[^>]*data-form-id="([a-f0-9-]+)"[^>]*>.*?<\/a>/i;

function extractFormIdFromBody(bodyHtml: string): string {
  return bodyHtml.match(FORM_LINK_REGEX)?.[1] ?? "";
}

export function upsertFormLink(bodyHtml: string, formId: string, formName: string, formLink: string): string {
  const linkHtml = `<a href="${formLink}" data-form-id="${formId}" target="_blank" rel="noopener noreferrer">${formName}</a>`;
  if (FORM_LINK_REGEX.test(bodyHtml)) {
    return bodyHtml.replace(FORM_LINK_REGEX, linkHtml);
  }
  return `${bodyHtml}<p>${linkHtml}</p>`;
}

function removeFormLink(bodyHtml: string): string {
  return bodyHtml.replace(FORM_LINK_REGEX, "").replace(/<p>\s*<\/p>/g, "");
}

export type EmailActionKind =
  | "buttons"
  | "attachments"
  | "video"
  | "form"
  | "plain";

interface EmailTemplateEditorProps {
  actionKind: EmailActionKind;
  template: EmailTemplate;
  onChange: (template: EmailTemplate) => void;
  /** "template" (default) = inline step editor with a Save button.
   *  "compose" = popup usage with Send/Cancel. */
  mode?: "template" | "compose";
  /** "template" mode: persists the step's content. "compose" mode: sends it. */
  onSend?: () => void | Promise<void>;
  onCancel?: () => void;
  /** "template" mode only — shows a spinner on the Save button while saving. */
  sending?: boolean;
  /** actionKind "buttons" only — the "Go to stage"/"Go to queue" transition
   *  pickers' options. Stages scoped to this step's own queue; queues
   *  system-wide. */
  stages?: Stage[];
  queues?: Queue[];
}

/** "specific-stage" shows the chosen stage's name once picked — reachable
 *  either directly ("Go to stage", scoped to this step's own queue, shown
 *  as "Go to stage X") or by browsing ("Go to queue" > a queue > one of
 *  its stages, shown as "Go to queue Y X" so it's clear which queue it
 *  jumps to first). Either path saves the same "specific-stage" outcome —
 *  the backend resolves the stage's own queue on its own. */
function buttonActionLabel(button: EmailActionButton): string {
  switch (button.action) {
    case "specific-stage":
      if (!button.targetStageName) return "Go to stage";
      return button.targetQueueName
        ? `Go to queue ${button.targetQueueName} ${button.targetStageName}`
        : `Go to stage ${button.targetStageName}`;
    case "convert-customer":
      return "Convert to customer";
    case "do-nothing":
      return "Do nothing";
  }
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

function EmailButtonChip({
  button,
  stages,
  queues,
  onChangeLabel,
  onChangeTarget,
}: {
  button: EmailActionButton;
  stages: Stage[];
  queues: Queue[];
  onChangeLabel: (label: string) => void;
  onChangeTarget: (patch: Partial<EmailActionButton>) => void;
}) {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  // Which second column is showing, if any — rendered inside the SAME Menu
  // (a flex MenuList, columns side by side) rather than as a second
  // floating Menu, so there's no gap between "trigger" and "submenu" for
  // the mouse to leave through. That gap is what caused the open/close
  // flicker: two separate Popovers each with their own hover zone race
  // each other on every small mouse movement between them.
  const [hoveredPanel, setHoveredPanel] = useState<"stage" | "queue" | null>(null);
  // "Go to queue" is a browsing aid, not a distinct outcome — hovering a
  // queue in its list reveals a third column of THAT queue's stages, and
  // picking one saves the same "specific-stage" action "Go to stage" does
  // directly (the backend resolves a stage's own queue on its own, so
  // there's no separate "queue only" outcome to save).
  const [hoveredQueueId, setHoveredQueueId] = useState<string | null>(null);
  const [stagesByQueueId, setStagesByQueueId] = useState<Record<string, Stage[] | "loading">>({});
  const [labelDraft, setLabelDraft] = useState(button.label);

  const closeAll = () => {
    setAnchorEl(null);
    setHoveredPanel(null);
    setHoveredQueueId(null);
  };

  const hoverQueue = (queue: Queue) => {
    setHoveredQueueId(queue.id);
    if (stagesByQueueId[queue.id]) return;
    setStagesByQueueId((prev) => ({ ...prev, [queue.id]: "loading" }));
    stagesApi
      .getStagesByQueue(queue.id)
      .then((fetched) => {
        setStagesByQueueId((prev) => ({ ...prev, [queue.id]: fetched }));
      })
      .catch(() => {
        setStagesByQueueId((prev) => ({ ...prev, [queue.id]: [] }));
      });
  };

  const chooseStage = (stage: Stage, queueName?: string) => {
    onChangeTarget({
      action: "specific-stage",
      targetStageId: stage.id,
      targetStageName: stage.name,
      targetQueueName: queueName,
    });
    closeAll();
  };
  const chooseSimple = (action: "convert-customer" | "do-nothing") => {
    onChangeTarget({
      action,
      targetStageId: undefined,
      targetStageName: undefined,
    });
    closeAll();
  };

  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.75,
        border: "1px solid #E0E0E0",
        borderRadius: "8px",
        pl: 1,
        pr: 0.5,
        py: 0.4,
        bgcolor: "#fff",
      }}
    >
      <input
        value={labelDraft}
        onChange={(e) => {
          setLabelDraft(e.target.value);
          onChangeLabel(e.target.value);
        }}
        style={{
          border: "none",
          outline: "none",
          fontSize: 12.5,
          fontWeight: 600,
          width: Math.max(32, labelDraft.length * 7 + 8),
          color: "#1A1A1A",
        }}
      />
      <Divider orientation="vertical" flexItem sx={{ my: 0.25 }} />
      <Tooltip title={buttonActionLabel(button)}>
        <Box
          onClick={(e) => setAnchorEl(e.currentTarget)}
          sx={{
            display: "flex",
            alignItems: "center",
            gap: 0.25,
            cursor: "pointer",
            fontSize: 12,
            color: "#5A5A5A",
            px: 0.5,
            minWidth: 0,
          }}
        >
          <Box
            component="span"
            sx={{
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              maxWidth: 140,
            }}
          >
            {buttonActionLabel(button)}
          </Box>
          <KeyboardArrowDownIcon sx={{ fontSize: 16, flexShrink: 0 }} />
        </Box>
      </Tooltip>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={closeAll}
        slotProps={{
          paper: { sx: { borderRadius: "8px" } },
          list: { sx: { display: "flex", alignItems: "stretch", p: 0 } },
        }}
      >
        <Box sx={{ minWidth: 170, py: 0.5 }}>
          <MenuItem
            selected={button.action === "specific-stage"}
            onMouseEnter={() => setHoveredPanel("stage")}
            sx={{ fontSize: 12.5, display: "flex", justifyContent: "space-between", gap: 1.5 }}
          >
            Go to stage
            <ChevronRightIcon sx={{ fontSize: 16, color: "#B0B0B0" }} />
          </MenuItem>
          <MenuItem
            onMouseEnter={() => setHoveredPanel("queue")}
            sx={{ fontSize: 12.5, display: "flex", justifyContent: "space-between", gap: 1.5 }}
          >
            Go to queue
            <ChevronRightIcon sx={{ fontSize: 16, color: "#B0B0B0" }} />
          </MenuItem>
          <MenuItem
            selected={button.action === "convert-customer"}
            onMouseEnter={() => setHoveredPanel(null)}
            onClick={() => chooseSimple("convert-customer")}
            sx={{ fontSize: 12.5 }}
          >
            Convert to customer
          </MenuItem>
          <MenuItem
            selected={button.action === "do-nothing"}
            onMouseEnter={() => setHoveredPanel(null)}
            onClick={() => chooseSimple("do-nothing")}
            sx={{ fontSize: 12.5 }}
          >
            Do nothing
          </MenuItem>
        </Box>

        {hoveredPanel && (
          <Box
            sx={{
              minWidth: 170,
              maxHeight: 260,
              overflowY: "auto",
              borderLeft: "1px solid #EEE",
              py: 0.5,
            }}
          >
            {hoveredPanel === "stage" &&
              (stages.length === 0 ? (
                <MenuItem disabled sx={{ fontSize: 12.5 }}>
                  No stages in this queue
                </MenuItem>
              ) : (
                stages.map((stage) => (
                  <MenuItem
                    key={stage.id}
                    selected={button.action === "specific-stage" && button.targetStageId === stage.id}
                    onClick={() => chooseStage(stage)}
                    sx={{ fontSize: 12.5 }}
                  >
                    {stage.name}
                  </MenuItem>
                ))
              ))}
            {hoveredPanel === "queue" &&
              (queues.length === 0 ? (
                <MenuItem disabled sx={{ fontSize: 12.5 }}>
                  No queues available
                </MenuItem>
              ) : (
                queues.map((queue) => (
                  <MenuItem
                    key={queue.id}
                    selected={hoveredQueueId === queue.id}
                    onMouseEnter={() => hoverQueue(queue)}
                    sx={{ fontSize: 12.5, display: "flex", justifyContent: "space-between", gap: 1.5 }}
                  >
                    {queue.name}
                    <ChevronRightIcon sx={{ fontSize: 16, color: "#B0B0B0" }} />
                  </MenuItem>
                ))
              ))}
          </Box>
        )}

        {/* Third column — stages of whichever queue is hovered above, only
            reachable via "Go to queue" (picking one still just saves a
            "specific-stage" action, same as the direct "Go to stage" list). */}
        {hoveredPanel === "queue" && hoveredQueueId && (
          <Box
            sx={{
              minWidth: 170,
              maxHeight: 260,
              overflowY: "auto",
              borderLeft: "1px solid #EEE",
              py: 0.5,
            }}
          >
            {(() => {
              const queueStages = stagesByQueueId[hoveredQueueId];
              if (queueStages === "loading") {
                return (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 1.5 }}>
                    <CircularProgress size={16} />
                  </Box>
                );
              }
              if (!queueStages || queueStages.length === 0) {
                return (
                  <MenuItem disabled sx={{ fontSize: 12.5 }}>
                    No stages in this queue
                  </MenuItem>
                );
              }
              const hoveredQueueName = queues.find((q) => q.id === hoveredQueueId)?.name;
              return queueStages.map((stage) => (
                <MenuItem
                  key={stage.id}
                  selected={button.action === "specific-stage" && button.targetStageId === stage.id}
                  onClick={() => chooseStage(stage, hoveredQueueName)}
                  sx={{ fontSize: 12.5 }}
                >
                  {stage.name}
                </MenuItem>
              ));
            })()}
          </Box>
        )}
      </Menu>
    </Box>
  );
}

export default function EmailTemplateEditor({
  actionKind,
  template,
  onChange,
  mode = "template",
  onSend,
  onCancel,
  sending = false,
  stages = [],
  queues = [],
}: EmailTemplateEditorProps) {
  const { showToast } = useToast();
  const { forms, loading: formsLoading } = useForms();
  const [showCcBcc, setShowCcBcc] = useState(
    Boolean(template.cc || template.bcc),
  );
  const [uploading, setUploading] = useState(false);

  const patch = (fields: Partial<EmailTemplate>) =>
    onChange({ ...template, ...fields });

  const selectedFormId = extractFormIdFromBody(template.bodyHtml);

  const handleSelectForm = (formId: string) => {
    if (!formId) {
      patch({ bodyHtml: removeFormLink(template.bodyHtml) });
      return;
    }
    const form = forms.find((f) => f.id === formId);
    if (!form) return;
    if (!form.link) {
      showToast("This form doesn't have a share link yet", "error");
      return;
    }
    patch({ bodyHtml: upsertFormLink(template.bodyHtml, form.id, form.name, form.link) });
  };

  const handleAttachFile = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const { url } = await storageApi.uploadFile(file);
      patch({ attachmentUrl: url });
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to upload file", "error");
    } finally {
      setUploading(false);
    }
  };

  const updateButton = (id: string, fields: Partial<EmailActionButton>) => {
    patch({
      buttons: template.buttons.map((b) =>
        b.id === id ? { ...b, ...fields } : b,
      ),
    });
  };

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
      {/* Recipient fields */}
      <Box
        sx={{
          px: 2,
          pt: 1.75,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {mode === "compose" && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="To"
              value={template.to}
              onChange={(e) => patch({ to: e.target.value })}
              sx={fieldSx}
            />
            {!showCcBcc && (
              <Button
                onClick={() => setShowCcBcc(true)}
                sx={{
                  textTransform: "none",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#1A73E8",
                  whiteSpace: "nowrap",
                }}
              >
                Cc / Bcc
              </Button>
            )}
          </Box>
        )}
        {mode === "compose" && showCcBcc && (
          <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
            <TextField
              size="small"
              fullWidth
              placeholder="Cc"
              value={template.cc}
              onChange={(e) => patch({ cc: e.target.value })}
              sx={fieldSx}
            />
            <TextField
              size="small"
              fullWidth
              placeholder="Bcc"
              value={template.bcc}
              onChange={(e) => patch({ bcc: e.target.value })}
              sx={fieldSx}
            />
            <IconButton
              size="small"
              onClick={() => {
                setShowCcBcc(false);
                patch({ cc: "", bcc: "" });
              }}
              sx={{ color: "#8A8A8A" }}
            >
              <CloseIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Box>
        )}
        <TextField
          size="small"
          fullWidth
          placeholder="Subject"
          value={template.subject}
          onChange={(e) => patch({ subject: e.target.value })}
          sx={fieldSx}
        />
      </Box>

      <RichTextEditor
        value={template.bodyHtml}
        onChange={(html) => patch({ bodyHtml: html })}
        placeholder="Write your email message here…"
      />

      {/* Action-kind specific extras */}
      {actionKind === "attachments" && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          {template.attachmentUrl ? (
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                gap: 1,
                border: "1px solid #E0E0E0",
                borderRadius: "8px",
                px: 1.25,
                py: 0.75,
                bgcolor: "#fff",
                width: "fit-content",
                maxWidth: "100%",
              }}
            >
              <InsertDriveFileOutlinedIcon
                sx={{ fontSize: 16, color: "#1A73E8", flexShrink: 0 }}
              />
              <Typography
                component="a"
                href={template.attachmentUrl}
                target="_blank"
                rel="noopener noreferrer"
                sx={{
                  fontSize: 12.5,
                  fontWeight: 600,
                  color: "#1A73E8",
                  textDecoration: "none",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  "&:hover": { textDecoration: "underline" },
                }}
              >
                {decodeURIComponent(
                  template.attachmentUrl.split("/").pop() || "Attachment",
                ).replace(/^[0-9a-f-]{36}-/i, "")}
              </Typography>
              <IconButton
                size="small"
                onClick={() => patch({ attachmentUrl: "" })}
                sx={{ color: "#8A8A8A" }}
              >
                <CloseIcon sx={{ fontSize: 14 }} />
              </IconButton>
            </Box>
          ) : (
            <Button
              startIcon={
                uploading ? (
                  <CircularProgress size={14} />
                ) : (
                  <AttachFileIcon sx={{ fontSize: 16 }} />
                )
              }
              component="label"
              disabled={uploading}
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
              {uploading ? "Uploading…" : "Attach file"}
              <input type="file" hidden onChange={handleAttachFile} />
            </Button>
          )}
        </Box>
      )}

      {actionKind === "video" && (
        <Box sx={{ px: 2, pb: 1.5 }}>
          <TextField
            size="small"
            fullWidth
            placeholder="Video URL (e.g. https://...)"
            value={template.videoUrl}
            onChange={(e) => patch({ videoUrl: e.target.value })}
            slotProps={{
              input: {
                startAdornment: (
                  <VideocamOutlinedIcon
                    sx={{ fontSize: 17, color: "#8A8A8A", mr: 1 }}
                  />
                ),
              },
            }}
            sx={fieldSx}
          />
        </Box>
      )}

      {actionKind === "form" && (
        <Box sx={{ px: 2, pb: 1.5, display: "flex", alignItems: "center", gap: 1.25 }}>
          <Select
            size="small"
            displayEmpty
            value={selectedFormId}
            onChange={(e) => handleSelectForm(e.target.value)}
            startAdornment={
              <DescriptionOutlinedIcon
                sx={{ fontSize: 16, color: "#8A8A8A", mr: 1 }}
              />
            }
            sx={{ minWidth: 220, fontSize: 12.5 }}
          >
            <MenuItem value="">
              <em style={{ color: "#B0B0B0", fontStyle: "normal" }}>
                {formsLoading ? "Loading forms…" : "Select a form"}
              </em>
            </MenuItem>
            {forms.map((f) => (
              <MenuItem key={f.id} value={f.id} sx={{ fontSize: 12.5 }}>
                {f.name}
              </MenuItem>
            ))}
          </Select>
          {selectedFormId && (
            <Typography sx={{ fontSize: 11.5, color: "#8A8A8A" }}>
              Link added to the message body
            </Typography>
          )}
        </Box>
      )}

      {/* Buttons row — styled to match how the sent email actually renders
          these: a bordered, centered group labeled "Action Buttons". */}
      {actionKind === "buttons" && (
        <Box sx={{ px: 2, pb: 1.75 }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: 1,
              border: "1px solid #E0E0E0",
              borderRadius: "8px",
              px: 2.5,
              py: 2,
            }}
          >
            <Typography
              sx={{
                fontSize: 11,
                fontWeight: 700,
                color: "#8A8A8A",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
              }}
            >
              Action Buttons
            </Typography>
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexWrap: "wrap",
                gap: 1,
              }}
            >
              {template.buttons.map((button) => (
                <EmailButtonChip
                  key={button.id}
                  button={button}
                  stages={stages}
                  queues={queues}
                  onChangeLabel={(label) => updateButton(button.id, { label })}
                  onChangeTarget={(patch) => updateButton(button.id, patch)}
                />
              ))}
            </Box>
          </Box>
        </Box>
      )}

      {/* Editable sign-off — every step-template email kind gets one, not
          just "buttons"; compose-mode (ad-hoc sends from Leads/Customers/
          Forms) skips it since the user already fully controls that body. */}
      {actionKind !== "plain" && (
        <Box sx={{ px: 2, pb: 1.75 }}>
          <TextField
            variant="standard"
            fullWidth
            multiline
            placeholder="Regards,&#10;The Team"
            value={template.signature}
            onChange={(e) => patch({ signature: e.target.value })}
            slotProps={{ input: { disableUnderline: true } }}
            sx={{
              "& .MuiInput-input": {
                fontSize: 12.5,
                color: "#8A8A8A",
                lineHeight: 1.5,
                p: 0,
              },
            }}
          />
        </Box>
      )}

      {/* Footer actions */}
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: mode === "compose" ? "flex-end" : "flex-start",
          gap: 0.5,
          px: 2,
          py: 1.25,
          borderTop: "1px solid #EEE",
        }}
      >
        {mode === "compose" ? (
          <>
            <Button
              onClick={onCancel}
              size="small"
              sx={{
                textTransform: "none",
                fontWeight: 600,
                fontSize: 12,
                color: "#5A5A5A",
              }}
            >
              Cancel
            </Button>
            <Button
              startIcon={
                sending ? (
                  <CircularProgress size={14} sx={{ color: "#fff" }} />
                ) : (
                  <SendOutlinedIcon sx={{ fontSize: 15 }} />
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
              Send
            </Button>
          </>
        ) : (
          <>
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
          </>
        )}
      </Box>
    </MotionBox>
  );
}

export function createEmptyEmailTemplate(): EmailTemplate {
  return {
    to: "",
    cc: "",
    bcc: "",
    subject: "",
    bodyHtml: "",
    videoUrl: "",
    attachmentUrl: "",
    buttons: [],
    signature: "Regards,\nThe Team",
  };
}
