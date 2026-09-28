"use client";

import React, { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import {
  Box,
  Typography,
  TextField,
  MenuItem,
  Checkbox,
  Radio,
  Button,
  CircularProgress,
} from "@mui/material";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutlineOutlined";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutlineOutlined";

import * as formsStore from "@/app/lib/forms/formsStore";
import { groupFieldsIntoRows } from "@/app/lib/forms/rows";
import type { FormDefinition, FormFieldDef } from "@/app/lib/forms/types";

const fieldSx = {
  "& .MuiOutlinedInput-root": { borderRadius: "8px", fontSize: 14 },
};

// Must match what's sent to the backend as each field's `name` (see
// formsStore's toApiField) — the backend maps `answers[field.name]` onto
// the Lead via that field's `mapTo`, so keying by `field.key` here instead
// of `field.id` would silently break that mapping for every well-known
// field (firstName/lastName/email/phoneNumber).
function fieldKey(field: FormFieldDef) {
  return field.id;
}

/** The real public form link — /pwa/<token> is what the backend hands
 *  back as each form's `link` (a signed, 365-day JWT decoded server-side
 *  by GET /forms/pwa/:token), unlike /f/:id which addresses a form by its
 *  raw id with no signature/expiry. Submission still posts to
 *  /forms/public/:id/submit using the id this resolves to. */
export default function PwaFormPage() {
  const params = useParams<{ token: string }>();
  const token = params.token;

  const [form, setForm] = useState<FormDefinition | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    formsStore
      .getFormByToken(token)
      .then(({ form: data }) => {
        if (cancelled) return;
        setForm(data);
      })
      .catch((err) => {
        if (cancelled) return;
        setLoadError(
          (err as { message?: string })?.message ?? "This form isn't available.",
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [token]);

  const setValue = (field: FormFieldDef, value: string) => {
    setValues((prev) => ({ ...prev, [fieldKey(field)]: value }));
  };

  const canSubmit =
    form?.fields.every((f) => !f.required || (values[fieldKey(f)] ?? "").trim()) ??
    false;

  const handleSubmit = async () => {
    if (!form || !canSubmit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      await formsStore.submitPublicForm(form.id, values);
      setSubmitted(true);
    } catch {
      setSubmitError("Something went wrong submitting your response. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const centeredCardSx = {
    bgcolor: "#fff",
    borderRadius: "16px",
    border: "1px solid #E5E5E5",
    boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
    p: 4,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    gap: 1,
    textAlign: "center" as const,
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        bgcolor: "#F0F1F5",
        display: "flex",
        justifyContent: "center",
        py: { xs: 3, sm: 6 },
        px: 2,
      }}
    >
      <Box sx={{ width: "100%", maxWidth: 640 }}>
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={26} />
          </Box>
        ) : loadError || !form ? (
          <Box sx={centeredCardSx}>
            <ErrorOutlineIcon sx={{ fontSize: 28, color: "#B23A3A" }} />
            <Typography sx={{ fontSize: 14, fontWeight: 700 }}>
              {loadError ?? "This form isn't available."}
            </Typography>
          </Box>
        ) : submitted ? (
          <Box sx={centeredCardSx}>
            <CheckCircleOutlineIcon sx={{ fontSize: 32, color: "#2E7D32" }} />
            <Typography sx={{ fontSize: 16, fontWeight: 700 }}>
              Your response has been recorded
            </Typography>
            <Typography sx={{ fontSize: 12.5, color: "#8A8A8A" }}>
              Thanks for reaching out — we&apos;ll be in touch shortly.
            </Typography>
          </Box>
        ) : (
          <Box
            sx={{
              bgcolor: "#fff",
              borderRadius: "16px",
              border: "1px solid #E5E5E5",
              boxShadow: "0 8px 24px rgba(0,0,0,0.06)",
              overflow: "hidden",
            }}
          >
            <Box
              sx={{
                bgcolor: form.theme.accentColor,
                px: 4,
                py: 4,
                display: "flex",
                flexDirection: "column",
                alignItems: form.theme.titleAlign === "left" ? "flex-start" : "center",
                textAlign: form.theme.titleAlign,
              }}
            >
              {form.theme.logoUrl && (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={form.theme.logoUrl}
                  alt=""
                  style={{ height: 36, marginBottom: 12 }}
                />
              )}
              <Typography sx={{ fontSize: 24, fontWeight: 800, color: "#fff" }}>
                {form.name}
              </Typography>
              {form.description && (
                <Typography sx={{ fontSize: 13, color: "rgba(255,255,255,0.85)", mt: 0.75 }}>
                  {form.description}
                </Typography>
              )}
            </Box>

            <Box sx={{ p: 4, display: "flex", flexDirection: "column", gap: 2.5 }}>
              {groupFieldsIntoRows(form.fields).map((row) => (
                <Box
                  key={row.map((f) => f.id).join("-")}
                  sx={{ display: "flex", gap: 2, alignItems: "flex-start" }}
                >
                  {row.map((field) => (
                    <Box key={field.id} sx={{ flex: 1, minWidth: 0 }}>
                      <Typography sx={{ fontSize: 13.5, fontWeight: 600, mb: 1 }}>
                        {field.label}
                        {field.required && (
                          <Box component="span" sx={{ color: "#D32F2F" }}>
                            {" "}
                            *
                          </Box>
                        )}
                      </Typography>

                      {field.type === "textarea" ? (
                        <TextField
                          fullWidth
                          multiline
                          minRows={3}
                          size="small"
                          value={values[fieldKey(field)] ?? ""}
                          onChange={(e) => setValue(field, e.target.value)}
                          sx={fieldSx}
                        />
                      ) : field.type === "select" ? (
                        <TextField
                          select
                          fullWidth
                          size="small"
                          value={values[fieldKey(field)] ?? ""}
                          onChange={(e) => setValue(field, e.target.value)}
                          sx={fieldSx}
                        >
                          {(field.options ?? []).map((opt) => (
                            <MenuItem key={opt.value} value={opt.value}>
                              {opt.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : field.type === "radio" ? (
                        <Box sx={{ display: "flex", flexDirection: "column", gap: 0.25 }}>
                          {(field.options ?? []).map((opt) => (
                            <Box
                              key={opt.value}
                              sx={{ display: "flex", alignItems: "center", gap: 0.5 }}
                            >
                              <Radio
                                size="small"
                                checked={values[fieldKey(field)] === opt.value}
                                onChange={() => setValue(field, opt.value)}
                                sx={{ p: 0.5 }}
                              />
                              <Typography sx={{ fontSize: 13, color: "#1A1A1A" }}>
                                {opt.label}
                              </Typography>
                            </Box>
                          ))}
                        </Box>
                      ) : field.type === "checkbox" ? (
                        <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                          <Checkbox
                            checked={values[fieldKey(field)] === "true"}
                            onChange={(e) =>
                              setValue(field, e.target.checked ? "true" : "")
                            }
                            sx={{ p: 0.5 }}
                          />
                          <Typography sx={{ fontSize: 12.5, color: "#5A5A5A" }}>
                            Yes
                          </Typography>
                        </Box>
                      ) : field.type === "date" ? (
                        <TextField
                          fullWidth
                          size="small"
                          type="date"
                          value={values[fieldKey(field)] ?? ""}
                          onChange={(e) => setValue(field, e.target.value)}
                          sx={fieldSx}
                        />
                      ) : (
                        <TextField
                          fullWidth
                          size="small"
                          type={field.type === "email" ? "email" : "text"}
                          value={values[fieldKey(field)] ?? ""}
                          onChange={(e) => setValue(field, e.target.value)}
                          sx={fieldSx}
                        />
                      )}
                    </Box>
                  ))}
                </Box>
              ))}

              {submitError && (
                <Typography sx={{ fontSize: 12.5, color: "#B23A3A" }}>
                  {submitError}
                </Typography>
              )}

              <Button
                onClick={handleSubmit}
                disabled={!canSubmit || submitting}
                fullWidth
                variant="contained"
                sx={{
                  textTransform: "none",
                  fontWeight: 700,
                  fontSize: 14,
                  py: 1.1,
                  borderRadius: "10px",
                  boxShadow: "none",
                  bgcolor: form.theme.accentColor,
                  "&:hover": {
                    bgcolor: form.theme.accentColor,
                    filter: "brightness(0.9)",
                    boxShadow: "none",
                  },
                }}
              >
                {submitting ? (
                  <CircularProgress size={16} sx={{ color: "#fff" }} />
                ) : (
                  "Submit"
                )}
              </Button>
            </Box>
          </Box>
        )}
      </Box>
    </Box>
  );
}
