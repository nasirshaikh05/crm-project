import { formsApi } from "@/app/lib/api";
import type { ApiForm, ApiFormField } from "@/app/lib/api/forms";
import {
  DEFAULT_FORM_THEME,
  type CreateFormPayload,
  type FormDefinition,
  type FormFieldDef,
  type FormFieldType,
  type FormSubmission,
  type FormTheme,
  type UpdateFormPayload,
  type WellKnownFieldKey,
} from "./types";

/**
 * Real backend now exists (`src/form` in salesgenie-api) — this file
 * converts between the builder's rich `FormDefinition`/`FormFieldDef`
 * shape and the backend's loose jsonb `fields`/`design` shape. Function
 * names/signatures match what callers (useForms, the builder, the public
 * page) already expect, so no calling code needed to change.
 */

function toApiField(f: FormFieldDef): ApiFormField {
  return {
    name: f.id,
    label: f.label,
    type: f.type,
    required: f.required,
    mapTo: f.key,
    newRow: f.newRow,
    placeholder: f.placeholder,
    options: f.options,
  };
}

function fromApiField(f: ApiFormField): FormFieldDef {
  return {
    id: f.name,
    key: f.mapTo as WellKnownFieldKey | undefined,
    label: f.label,
    type: f.type as FormFieldType,
    required: Boolean(f.required),
    newRow: f.newRow,
    placeholder: f.placeholder,
    options: f.options,
  };
}

function toApiDesign(theme: FormTheme): Record<string, unknown> {
  return {
    theme: "custom",
    primaryColor: theme.accentColor,
    logoUrl: theme.logoUrl,
    titleAlign: theme.titleAlign,
  };
}

function fromApiDesign(design: ApiForm["design"] | undefined): FormTheme {
  return {
    accentColor:
      typeof design?.primaryColor === "string"
        ? design.primaryColor
        : DEFAULT_FORM_THEME.accentColor,
    logoUrl: typeof design?.logoUrl === "string" ? design.logoUrl : undefined,
    titleAlign: design?.titleAlign === "left" ? "left" : "center",
  };
}

function fromApiForm(form: ApiForm): FormDefinition {
  return {
    id: form.id,
    name: form.title,
    description: form.description ?? "",
    theme: fromApiDesign(form.design),
    fields: (form.fields ?? []).map((f) => fromApiField(f as ApiFormField)),
    createdAt: form.createdAt,
    updatedAt: form.updatedAt,
    link: form.link,
  };
}

export async function getForms(): Promise<FormDefinition[]> {
  const forms = await formsApi.getForms();
  return forms.map(fromApiForm);
}

export async function getForm(id: string): Promise<FormDefinition> {
  return fromApiForm(await formsApi.getForm(id));
}

// Every form built through this UI is meant to capture leads — the
// builder has no purpose/transition picker yet, so this is the one
// sensible default until that's built.
export async function createForm(
  payload: CreateFormPayload,
): Promise<FormDefinition> {
  const created = await formsApi.createForm({
    title: payload.name,
    description: payload.description,
    fields: payload.fields.map(toApiField),
    design: toApiDesign(payload.theme ?? DEFAULT_FORM_THEME),
    purpose: "lead_creation",
  });
  return fromApiForm(created);
}

export async function updateForm(
  id: string,
  payload: UpdateFormPayload,
): Promise<FormDefinition> {
  const updated = await formsApi.updateForm(id, {
    title: payload.name,
    description: payload.description,
    fields: payload.fields?.map(toApiField),
    design: payload.theme ? toApiDesign(payload.theme) : undefined,
  });
  return fromApiForm(updated);
}

export async function deleteForm(id: string): Promise<void> {
  await formsApi.deleteForm(id);
}

/** Public, unauthenticated. */
export async function getPublicForm(id: string): Promise<FormDefinition> {
  return fromApiForm(await formsApi.getPublicForm(id));
}

/** Public, unauthenticated — resolves a /pwa/:token share link. Returns
 *  the target form's real id alongside it since submission still goes
 *  through POST /forms/public/:id/submit, which needs the raw id, not
 *  the token. */
export async function getFormByToken(
  token: string,
): Promise<{ form: FormDefinition; leadId: string | null }> {
  const result = await formsApi.getFormByToken(token);
  return { form: fromApiForm(result.form), leadId: result.leadId };
}

/** Public, unauthenticated. For `lead_creation` forms (the only purpose the
 *  builder produces today), the backend creates the Lead itself from
 *  `answers`, matched via each field's `mapTo` — no separate
 *  `leadsApi.registerPublicLead` call is needed here anymore. */
export async function submitPublicForm(
  id: string,
  values: Record<string, string>,
): Promise<FormSubmission> {
  const result = await formsApi.submitPublicForm(id, { answers: values });
  return {
    id: result.id,
    formId: result.formId,
    values,
    createdLeadId: result.leadId ?? null,
    submittedAt: result.submittedAt,
  };
}
