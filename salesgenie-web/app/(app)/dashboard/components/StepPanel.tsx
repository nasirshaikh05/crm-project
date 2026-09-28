"use client";

import React, { useEffect, useState } from "react";
import {
  Box,
  Typography,
  IconButton,
  CircularProgress,
  Radio,
} from "@mui/material";
import { AnimatePresence, motion, type Variants } from "framer-motion";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import CloseIcon from "@mui/icons-material/Close";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutlined";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";

import EmailTemplateEditor, {
  createEmptyEmailTemplate,
  type EmailActionKind,
} from "./EmailTemplateEditor";
import CalendarInviteEditor, {
  createEmptyCalendarInvite,
} from "./CalendarInviteEditor";
import type {
  CalendarInvite,
  EmailActionButton,
  EmailButtonAction,
  EmailTemplate,
} from "../type";
import { useSteps } from "@/app/lib/hooks/useSteps";
import { useStages } from "@/app/lib/hooks/useStages";
import { useQueues } from "@/app/lib/hooks/useQueues";
import { useToast } from "@/app/components/ToastProvider";
import { stepsApi, type ApiError } from "@/app/lib/api";
import type {
  Queue,
  StepActionType,
  StepDetail,
  TransitionTargetType,
} from "@/app/lib/api/types";

interface StepPanelProps {
  queueId?: string | null;
  queueName?: string;
  stageId: string;
  stageName: string;
}

const LEFT_ACTIONS = [
  "Send email with buttons",
  "Send email with attachments",
  "Send email with video",
  "Send calender invite",
  "Send email with Form",
  "Send Agreement for Signature",
];

const ACTION_TYPE_BY_LABEL: Record<string, StepActionType> = {
  "Send email with buttons": "send_email_with_buttons",
  "Send email with attachments": "send_email_with_attachments",
  "Send email with video": "send_email_with_video",
  "Send calender invite": "send_calendar_invite",
  "Send email with Form": "send_email_with_form",
  "Send Agreement for Signature": "send_agreement_for_signature",
  "Send to next Step": "go_to_next_step",
  "Send to next Stage": "go_to_next_stage",
  "Send to next Queue": "go_to_next_queue",
  "Convert to customer": "convert_to_customer",
  "Do nothing": "do_nothing",
  "Send SMS": "send_sms",
};

const LABEL_BY_ACTION_TYPE = Object.fromEntries(
  Object.entries(ACTION_TYPE_BY_LABEL).map(([label, type]) => [type, label]),
) as Record<StepActionType, string>;

const EMAIL_KIND_BY_ACTION_TYPE: Partial<
  Record<StepActionType, EmailActionKind>
> = {
  send_email_with_buttons: "buttons",
  // Backend treats agreement-for-signature identically to a buttons email
  // (same button/transition mechanism, no separate e-sign flow) — reuse it.
  send_agreement_for_signature: "buttons",
  send_email_with_attachments: "attachments",
  send_email_with_video: "video",
  send_email_with_form: "form",
};

const TRANSITION_TARGET_BY_BUTTON_ACTION: Record<
  EmailButtonAction,
  TransitionTargetType
> = {
  "specific-stage": "specific_stage",
  "convert-customer": "convert_to_customer",
  "do-nothing": "do_nothing",
};

// Reverse of the above, for hydrating a button's dropdown from its saved
// transition on read. Any target type this UI never produces (next_step,
// next_stage, etc. — reachable only via other flows) has nothing to map
// back to here, so it falls back to "do-nothing" for display purposes.
const BUTTON_ACTION_BY_TRANSITION_TARGET: Partial<
  Record<TransitionTargetType, EmailButtonAction>
> = {
  specific_stage: "specific-stage",
  convert_to_customer: "convert-customer",
  do_nothing: "do-nothing",
};

/** "Send email with buttons" always ships with exactly these two — no add,
 *  no remove, just relabel and pick each one's transition. */
function createDefaultButtons(): EmailActionButton[] {
  return [
    { id: "draft-yes", label: "Yes", action: "do-nothing" },
    { id: "draft-no", label: "No", action: "do-nothing" },
  ];
}

const MotionBox = motion.create(Box);

// The panel only ever renders while a stage is selected, so it's always
// "elevated" — no toggle needed. y/boxShadow have to be set here (not via
// sx) because framer-motion writes animated variant values directly onto
// the DOM node as inline styles, which always wins over a same-property
// sx rule.
const panelVariants: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: -5,
    boxShadow: "0 10px 24px rgba(0,0,0,0.12)",
    transition: { duration: 0.35, ease: "easeOut" },
  },
};

const containerVariants: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.15,
    },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, x: -8 },
  show: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.25, ease: "easeOut" },
  },
};

function ActionItem({
  label,
  isSelected,
  isConfigured,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  isConfigured: boolean;
  onClick: () => void;
}) {
  return (
    <MotionBox
      variants={itemVariants}
      onClick={onClick}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 0.5,
        cursor: "pointer",
        width: "fit-content",
      }}
    >
      <Radio
        checked={isSelected}
        size="small"
        sx={{
          p: 0,
          color: "#C0C0C0",
          "&.Mui-checked": { color: "#1A73E8" },
        }}
      />
      <Typography
        sx={{
          fontSize: 12.5,
          color: isSelected ? "#1A73E8" : "#1A1A1A",
          fontWeight: isSelected ? 700 : 400,
          "&:hover": { color: "#1A73E8" },
        }}
      >
        {label}
      </Typography>
      {isConfigured && (
        <CheckCircleIcon
          titleAccess="Already configured for this stage"
          sx={{ fontSize: 13, color: "#1F9254" }}
        />
      )}
    </MotionBox>
  );
}

// The sign-off is now saved separately as metadata.regards (sent to the
// backend as its own field, appended as a real email footer server-side —
// see lead.service.ts's executeAction) rather than baked into `body`. Steps
// saved before that change still have it embedded behind this marker, so
// reading still splits it out for a clean display; every Save from here on
// writes it the new way, which self-heals those old steps once re-saved.
const SIGNATURE_MARKER = "<!--signature-->";
const DEFAULT_SIGNATURE = "Regards,\nThe Team";

function unescapeHtml(html: string): string {
  return html.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&amp;/g, "&");
}

function htmlToSignature(html: string): string {
  return unescapeHtml(
    html
      .replace(/^<p>/i, "")
      .replace(/<\/p>$/i, "")
      .replace(/<br\s*\/?>/gi, "\n"),
  );
}

function legacySignatureFromBody(body: string): string | null {
  const markerIndex = body.indexOf(SIGNATURE_MARKER);
  if (markerIndex === -1) return null;
  return htmlToSignature(body.slice(markerIndex + SIGNATURE_MARKER.length));
}

function emailTemplateFromDetail(
  detail: StepDetail,
  queueId: string | null,
  queues: Queue[],
): EmailTemplate {
  const meta = (detail.actionContent?.metadata ?? {}) as Record<
    string,
    unknown
  >;
  const buttons: EmailActionButton[] = detail.buttons.map((b) => {
    const transition = b.transition;
    const action = transition
      ? (BUTTON_ACTION_BY_TRANSITION_TARGET[transition.targetType] ?? "do-nothing")
      : "do-nothing";
    const targetStageId = transition?.targetStageId ?? undefined;
    // Resolved server-side (see StepService.findOneWithConfig) since the
    // target stage can belong to a different queue than this step's own —
    // `stages` here only ever holds this step's own queue's stages.
    const targetStageName = transition?.targetStageName ?? undefined;
    const targetQueueName =
      targetStageId && transition?.targetStageQueueId && transition.targetStageQueueId !== queueId
        ? queues.find((q) => q.id === transition.targetStageQueueId)?.name
        : undefined;
    return {
      id: b.id,
      label: b.label,
      action,
      targetStageId,
      targetStageName,
      targetQueueName,
    };
  });
  const rawBody = detail.actionContent?.body ?? "";
  const markerIndex = rawBody.indexOf(SIGNATURE_MARKER);
  const bodyHtml = markerIndex === -1 ? rawBody : rawBody.slice(0, markerIndex);
  const signature =
    typeof meta.regards === "string"
      ? meta.regards
      : (legacySignatureFromBody(rawBody) ?? DEFAULT_SIGNATURE);
  return {
    to: typeof meta.to === "string" ? meta.to : "",
    cc: typeof meta.cc === "string" ? meta.cc : "",
    bcc: typeof meta.bcc === "string" ? meta.bcc : "",
    subject: detail.actionContent?.subject ?? "",
    bodyHtml,
    videoUrl: detail.actionContent?.videoUrl ?? "",
    attachmentUrl: detail.actionContent?.attachmentUrl ?? "",
    buttons,
    signature,
  };
}

function calendarInviteFromDetail(detail: StepDetail): CalendarInvite {
  return {
    title: detail.actionContent?.subject ?? "",
    description: detail.actionContent?.body ?? "",
  };
}

/** A step row can exist without ever having been saved — only count it as
 *  "configured" once it actually has subject/body/button content. */
function stepHasContent(detail: StepDetail): boolean {
  return Boolean(
    detail.actionContent?.subject?.trim() ||
      detail.actionContent?.body?.trim() ||
      detail.buttons.length > 0,
  );
}

/**
 * Steps carry a stageId, so each stage's configured actions are genuinely
 * its own — picking (or creating) an action always resolves against steps
 * belonging to THIS stage, never a same-actionType step from another stage.
 */
export default function StepPanel({
  queueId = null,
  queueName = "",
  stageId,
  stageName,
}: StepPanelProps) {
  const { showToast } = useToast();
  // For the "buttons" action kind's "Go to stage"/"Go to queue" transition
  // pickers — stages scoped to this step's own queue, queues system-wide.
  const { stages } = useStages(queueId);
  const { queues } = useQueues();
  const {
    steps,
    createStep,
    updateStep,
    deleteStep,
    addButtonToStep,
    updateStepButton,
    addButtonTransition,
  } = useSteps();

  // Which action is being viewed/edited per stage — purely local until Save
  // actually creates the backing step, so browsing the list never writes
  // anything to the backend.
  const [selectedActionTypeByStageId, setSelectedActionTypeByStageId] =
    useState<Record<string, StepActionType | null>>({});
  const selectedActionType = selectedActionTypeByStageId[stageId] ?? null;
  const setSelectedActionType = (type: StepActionType | null) =>
    setSelectedActionTypeByStageId((prev) => ({ ...prev, [stageId]: type }));

  const [activeDetail, setActiveDetail] = useState<StepDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [sending, setSending] = useState(false);
  // Picking an action just selects it inline — the template editor itself
  // (email/calendar content) opens in a popup on top.
  const [templateEditorOpen, setTemplateEditorOpen] = useState(false);

  // Keyed by stage+actionType (not step id) so a draft survives the
  // null-step → real-step transition when Save creates it for the first time.
  const [templatesByDraftKey, setTemplatesByDraftKey] = useState<
    Record<string, EmailTemplate>
  >({});
  const [invitesByDraftKey, setInvitesByDraftKey] = useState<
    Record<string, CalendarInvite>
  >({});

  const stepsForStage = steps.filter((s) => s.stageId === stageId);
  const activeStep = selectedActionType
    ? stepsForStage.find((s) => s.actionType === selectedActionType) ?? null
    : null;
  const activeLabel = selectedActionType
    ? LABEL_BY_ACTION_TYPE[selectedActionType]
    : null;
  // Guards against a stale fetch from a previously-viewed step leaking into
  // this one when switching between two actions that both have no backing
  // step yet (their effect dependency doesn't change, so it never reruns).
  const detailForActiveStep =
    activeStep && activeDetail?.id === activeStep.id ? activeDetail : null;

  // A step *row* can exist for a stage+actionType without ever having been
  // saved — e.g. leftover rows from before picking an action stopped
  // creating one immediately. The "configured" checkmark should only light
  // up once there's real saved content, so each stage's steps get checked
  // for actual content, not just existence.
  const [hasContentByStepId, setHasContentByStepId] = useState<
    Record<string, boolean>
  >({});

  useEffect(() => {
    const idsToCheck = stepsForStage
      .map((s) => s.id)
      .filter((id) => !(id in hasContentByStepId));
    if (idsToCheck.length === 0) return;

    let cancelled = false;
    (async () => {
      const results = await Promise.all(
        idsToCheck.map(async (id) => {
          try {
            const detail = await stepsApi.getStep(id);
            return [id, stepHasContent(detail)] as const;
          } catch {
            return [id, false] as const;
          }
        }),
      );
      if (cancelled) return;
      setHasContentByStepId((prev) => {
        const next = { ...prev };
        for (const [id, hasContent] of results) next[id] = hasContent;
        return next;
      });
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [steps, stageId]);

  useEffect(() => {
    let cancelled = false;

    async function loadDetail() {
      if (!activeStep) {
        setActiveDetail(null);
        return;
      }
      setDetailLoading(true);
      try {
        const detail = await stepsApi.getStep(activeStep.id);
        if (cancelled) return;
        setActiveDetail(detail);
        setHasContentByStepId((prev) => ({
          ...prev,
          [detail.id]: stepHasContent(detail),
        }));
        const draftKey = `${stageId}:${detail.actionType}`;
        if (detail.actionType === "send_calendar_invite") {
          const invite = calendarInviteFromDetail(detail);
          setInvitesByDraftKey((prev) => ({ ...prev, [draftKey]: invite }));
        } else if (EMAIL_KIND_BY_ACTION_TYPE[detail.actionType]) {
          const template = emailTemplateFromDetail(detail, queueId, queues);
          setTemplatesByDraftKey((prev) => ({ ...prev, [draftKey]: template }));
        }
      } catch (err) {
        if (!cancelled) {
          showToast(
            (err as ApiError).message ?? "Failed to load step",
            "error",
          );
        }
      } finally {
        if (!cancelled) setDetailLoading(false);
      }
    }

    // Fetching from the backend whenever the active (real) step changes —
    // brand-new/unsaved selections have no step yet, so nothing to fetch.
    loadDetail();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeStep?.id, stageId]);

  // Selecting an action never touches the backend — it only creates (and
  // therefore attaches to this stage) once the user actually clicks Save.
  const handlePickAction = (label: string) => {
    setSelectedActionType(ACTION_TYPE_BY_LABEL[label]);
    setTemplateEditorOpen(true);
  };

  const emailActionKind = selectedActionType
    ? EMAIL_KIND_BY_ACTION_TYPE[selectedActionType]
    : undefined;
  const isCalendarInvite = selectedActionType === "send_calendar_invite";
  const draftKey = selectedActionType ? `${stageId}:${selectedActionType}` : null;

  const activeTemplate = emailActionKind
    ? (draftKey ? templatesByDraftKey[draftKey] : undefined) ?? {
        ...createEmptyEmailTemplate(),
        buttons: emailActionKind === "buttons" ? createDefaultButtons() : [],
      }
    : null;

  const activeInvite = isCalendarInvite
    ? (draftKey ? invitesByDraftKey[draftKey] : undefined) ??
      createEmptyCalendarInvite()
    : null;

  // Persists whatever's currently in the editor. A stage only ever has one
  // configured action: if it already has a step of a DIFFERENT actionType,
  // that step's actionType is changed in place (PUT /steps/:id) rather than
  // deleted-and-recreated — deleting outright fails whenever leads are
  // currently sitting on that step (backend guards against orphaning
  // them), and there's no need to churn the row's identity anyway, since
  // the backend supports repurposing a step directly. For "buttons" kind,
  // the two fixed Yes/No buttons get created (or updated) here too,
  // matched by position since they can't be added/removed, only
  // relabeled/retargeted.
  const handleSave = async () => {
    if (!selectedActionType || !draftKey) return;
    setSending(true);
    try {
      const actionContent =
        isCalendarInvite && activeInvite
          ? { subject: activeInvite.title, body: activeInvite.description }
          : emailActionKind && activeTemplate
            ? {
                subject: activeTemplate.subject,
                body: activeTemplate.bodyHtml,
                videoUrl: activeTemplate.videoUrl,
                attachmentUrl: activeTemplate.attachmentUrl,
                metadata: {
                  to: activeTemplate.to,
                  cc: activeTemplate.cc,
                  bcc: activeTemplate.bcc,
                  regards: activeTemplate.signature,
                },
              }
            : undefined;

      let stepId: string;
      let existingButtons = detailForActiveStep?.buttons ?? [];
      const repurposedStep = activeStep
        ? null
        : stepsForStage.find((s) => s.actionType !== selectedActionType);

      if (activeStep) {
        // Already the right actionType — just update its content.
        stepId = activeStep.id;
        await updateStep(stepId, { actionContent });
        // Refetch rather than trust `detailForActiveStep` — it's only as
        // fresh as whenever the panel last loaded this step, and saving
        // against a stale snapshot (e.g. clicking Save again quickly) was
        // creating duplicate button rows instead of reusing the real ones.
        const latestDetail = await stepsApi.getStep(stepId);
        existingButtons = latestDetail.buttons ?? [];
      } else if (repurposedStep) {
        // Stage has a different action configured — repurpose that same
        // step instead of deleting it. Its old buttons (if any) belonged
        // to its previous actionType, so they're not reusable here.
        stepId = repurposedStep.id;
        await updateStep(stepId, { actionType: selectedActionType, actionContent });
        existingButtons = [];
        const oldDraftKey = `${stageId}:${repurposedStep.actionType}`;
        setTemplatesByDraftKey((prev) => {
          const next = { ...prev };
          delete next[oldDraftKey];
          return next;
        });
        setInvitesByDraftKey((prev) => {
          const next = { ...prev };
          delete next[oldDraftKey];
          return next;
        });
      } else {
        const created = await createStep({
          name: LABEL_BY_ACTION_TYPE[selectedActionType],
          orderIndex: stepsForStage.length,
          actionType: selectedActionType,
          stageId,
          actionContent,
        });
        stepId = created.id;
        existingButtons = [];
      }

      if (emailActionKind === "buttons" && activeTemplate) {
        for (let i = 0; i < activeTemplate.buttons.length; i++) {
          const draftButton = activeTemplate.buttons[i];
          const realButton = existingButtons[i];
          const realButtonId = realButton
            ? realButton.id
            : (
                await addButtonToStep(stepId, {
                  label: draftButton.label,
                  orderIndex: i,
                })
              ).id;
          if (realButton && realButton.label !== draftButton.label) {
            await updateStepButton(realButtonId, { label: draftButton.label });
          }
          await addButtonTransition(realButtonId, {
            targetType: TRANSITION_TARGET_BY_BUTTON_ACTION[draftButton.action],
            targetStageId:
              draftButton.action === "specific-stage" ? draftButton.targetStageId : undefined,
          });
        }
      }

      const freshDetail = await stepsApi.getStep(stepId);
      setActiveDetail(freshDetail);
      setHasContentByStepId((prev) => ({
        ...prev,
        [freshDetail.id]: stepHasContent(freshDetail),
      }));
      if (freshDetail.actionType === "send_calendar_invite") {
        setInvitesByDraftKey((prev) => ({
          ...prev,
          [draftKey]: calendarInviteFromDetail(freshDetail),
        }));
      } else if (EMAIL_KIND_BY_ACTION_TYPE[freshDetail.actionType]) {
        setTemplatesByDraftKey((prev) => ({
          ...prev,
          [draftKey]: emailTemplateFromDetail(freshDetail, queueId, queues),
        }));
      }
      showToast("Saved", "success");
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to save", "error");
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async () => {
    if (!activeStep) return;
    try {
      await deleteStep(activeStep.id);
      setSelectedActionType(null);
      setTemplateEditorOpen(false);
      showToast("Deleted", "success");
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to delete", "error");
    }
  };

  return (
    <Box>
      {/* Breadcrumb row */}
      <Typography sx={{ fontSize: 12.5, marginBottom: 2.5 }}>
        <Box
          component="span"
          sx={{ color: "#8A8A8A", fontWeight: 300, cursor: "pointer" }}
        >
          Home
        </Box>{" "}
        <Box component="span" sx={{ color: "#8A8A8A" }}>
          &gt;
        </Box>{" "}
        <Box
          component="span"
          sx={{ color: "#8A8A8A", fontWeight: 300, cursor: "pointer" }}
        >
          {queueName}
        </Box>{" "}
        <Box component="span" sx={{ color: "#8A8A8A" }}>
          &gt;
        </Box>{" "}
        <Box
          component="span"
          sx={{ color: "#8A8A8A", fontWeight: 300, cursor: "pointer" }}
        >
          {stageName}
        </Box>{" "}
        <Box component="span" sx={{ color: "#8A8A8A" }}>
          &gt;
        </Box>{" "}
        <Box component="span" sx={{ color: "#1A73E8", fontWeight: 400 }}>
          {activeLabel ?? "New step"}
        </Box>
      </Typography>

      {/* Panel */}
      <MotionBox
        variants={panelVariants}
        initial="hidden"
        animate="show"
        sx={{
          border: "1px solid #1A73E8",
          borderRadius: "10px",
          bgcolor: "#fff",
        }}
      >
        {/* Panel header */}
        <Box
          sx={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            px: 2,
            py: 1.25,
            borderBottom: "1px solid #F0F0F0",
          }}
        >
          <Typography
            sx={{ fontSize: 13.5, fontWeight: 700, color: "#1A73E8" }}
          >
            {activeLabel ?? "Steps"}
          </Typography>
          <IconButton size="small">
            <MoreVertIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Box>

        {/* Action picker — always visible. Clicking any item both creates
            (if this stage doesn't have one of that type yet) and selects
            it. The check icon marks actions already configured for THIS
            stage specifically. */}
        <Box sx={{ px: 2, py: 1.75 }}>
          <Typography sx={{ fontSize: 12.5, color: "#5A5A5A", mb: 1.5 }}>
            Please select an <b>action</b> from below, these are standard for
            all steps
          </Typography>

          <MotionBox
            variants={containerVariants}
            initial="hidden"
            animate="show"
            sx={{ display: "flex", gap: 4 }}
          >
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                gap: 1.4,
                flex: 1,
              }}
            >
              {LEFT_ACTIONS.map((action) => (
                <Box
                  key={action}
                  sx={{ display: "flex", alignItems: "center", gap: 0.75 }}
                >
                  <ActionItem
                    label={action}
                    isSelected={action === activeLabel}
                    isConfigured={stepsForStage.some(
                      (s) =>
                        s.actionType === ACTION_TYPE_BY_LABEL[action] &&
                        hasContentByStepId[s.id],
                    )}
                    onClick={() => handlePickAction(action)}
                  />
                </Box>
              ))}
            </Box>
          </MotionBox>
        </Box>

      </MotionBox>

      {/* Template editor — renders inline below the step box once an
          action is picked, not as a popup. */}
      <AnimatePresence>
        {templateEditorOpen && selectedActionType && (
          <MotionBox
            key="template-editor"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: -5, boxShadow: "0 10px 24px rgba(0,0,0,0.12)" }}
            exit={{ opacity: 0, y: 12, boxShadow: "0 0px 0px rgba(0,0,0,0)" }}
            transition={{ duration: 0.25, ease: "easeOut" }}
            sx={{
              mt: 2,
              border: "1px solid #1A73E8",
              borderRadius: "10px",
              bgcolor: "#fff",
            }}
          >
            <Box
              sx={{
                display: "flex",
                alignItems: "center",
                justifyContent: "flex-end",
                gap: 0.5,
                px: 1.5,
                pt: 1.5,
              }}
            >
              {activeStep && (
                <IconButton
                  onClick={handleDelete}
                  size="small"
                  title="Delete this action"
                  sx={{ color: "#B23A3A" }}
                >
                  <DeleteOutlineIcon sx={{ fontSize: 18 }} />
                </IconButton>
              )}
              <IconButton onClick={() => setTemplateEditorOpen(false)} size="small">
                <CloseIcon sx={{ fontSize: 18 }} />
              </IconButton>
            </Box>
            <Box sx={{ px: 0.5, pb: 1 }}>
              {detailLoading && !detailForActiveStep ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
                  <CircularProgress size={20} />
                </Box>
              ) : (
                <>
                  {emailActionKind && activeTemplate && draftKey && (
                    <EmailTemplateEditor
                      actionKind={emailActionKind}
                      template={activeTemplate}
                      stages={stages}
                      queues={queues}
                      onChange={(next) =>
                        setTemplatesByDraftKey((prev) => ({
                          ...prev,
                          [draftKey]: next,
                        }))
                      }
                      onSend={handleSave}
                      sending={sending}
                    />
                  )}

                  {isCalendarInvite && activeInvite && draftKey && (
                    <CalendarInviteEditor
                      invite={activeInvite}
                      onChange={(next) =>
                        setInvitesByDraftKey((prev) => ({
                          ...prev,
                          [draftKey]: next,
                        }))
                      }
                      onSend={handleSave}
                      sending={sending}
                    />
                  )}

                  {!emailActionKind && !isCalendarInvite && (
                    <Box sx={{ px: 2, py: 2 }}>
                      <Typography sx={{ fontSize: 12.5, color: "#8A8A8A" }}>
                        This step type needs no further setup.
                      </Typography>
                    </Box>
                  )}
                </>
              )}
            </Box>
          </MotionBox>
        )}
      </AnimatePresence>
    </Box>
  );
}
