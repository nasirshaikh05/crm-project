"use client";

import React, { useState } from "react";
import { Dialog, DialogTitle, DialogContent, IconButton, Typography } from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";

import EmailTemplateEditor, {
  createEmptyEmailTemplate,
} from "@/app/(app)/dashboard/components/EmailTemplateEditor";
import type { EmailTemplate } from "@/app/(app)/dashboard/type";
import { notificationsApi, type ApiError } from "@/app/lib/api";
import { useToast } from "@/app/components/ToastProvider";

interface SendEmailDialogProps {
  customerName: string;
  customerEmail: string;
  onClose: () => void;
}

export default function SendEmailDialog({
  customerName,
  customerEmail,
  onClose,
}: SendEmailDialogProps) {
  const { showToast } = useToast();
  const [template, setTemplate] = useState<EmailTemplate>(() => ({
    ...createEmptyEmailTemplate(),
    to: customerEmail,
  }));
  const [sending, setSending] = useState(false);

  const handleSend = async () => {
    if (sending) return;
    if (!template.to.trim() || !template.subject.trim() || !template.bodyHtml.trim()) {
      showToast("Subject and body are required", "error");
      return;
    }
    setSending(true);
    try {
      const result = await notificationsApi.sendEmail({
        to: template.to.trim(),
        subject: template.subject.trim(),
        body: template.bodyHtml,
      });
      if (!result.success) {
        showToast(result.message, "error");
        return;
      }
      showToast(`Email sent to ${customerName}`, "success");
      onClose();
    } catch (err) {
      showToast((err as ApiError).message ?? "Failed to send email", "error");
    } finally {
      setSending(false);
    }
  };

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
          fontSize: 15,
          fontWeight: 700,
        }}
      >
        <Typography sx={{ fontSize: 15, fontWeight: 700 }}>
          Send email to {customerName}
        </Typography>
        <IconButton size="small" onClick={onClose}>
          <CloseIcon sx={{ fontSize: 18 }} />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ pt: 0, pb: 2 }}>
        <EmailTemplateEditor
          actionKind="plain"
          template={template}
          onChange={setTemplate}
          mode="compose"
          onSend={handleSend}
          onCancel={onClose}
          sending={sending}
        />
      </DialogContent>
    </Dialog>
  );
}
