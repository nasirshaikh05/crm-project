import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";

/** Raw shapes matching the backend exactly — `fields`/`design` are stored
 *  as schemaless jsonb there, so these are intentionally loose. The
 *  richer, builder-friendly types live in app/lib/forms/types.ts; the
 *  conversion between the two happens in app/lib/forms/formsStore.ts. */
export interface ApiFormField {
  name: string;
  label: string;
  type: string;
  required?: boolean;
  /** When set, this field's answer maps onto the real Lead record created
   *  from a submission (see the backend's FormService.submit). */
  mapTo?: "firstName" | "lastName" | "email" | "phoneNumber" | "suburb" | "state" | "postcode";
  newRow?: boolean;
  placeholder?: string;
  options?: { label: string; value: string }[];
}

export interface ApiFormDesign {
  theme?: "light" | "dark" | "custom";
  primaryColor?: string;
  backgroundColor?: string;
  fontFamily?: string;
  borderRadius?: string;
  layout?: "single-column" | "two-column";
  logoUrl?: string;
  /** Not part of the backend's documented design shape, but jsonb storage
   *  is schemaless — extra keys like this round-trip fine. */
  titleAlign?: "left" | "center";
}

export interface ApiForm {
  id: string;
  title: string;
  description?: string;
  fields: ApiFormField[];
  design: ApiFormDesign;
  userId?: string | null;
  workspaceId?: string | null;
  isActive: boolean;
  purpose: "lead_creation" | "lead_update" | "generic";
  onSuccessTransition?: {
    queueId?: string;
    stageId?: string;
    stepId?: string;
  } | null;
  createdAt: string;
  updatedAt: string;
  /** A long-lived (365d) signed link the backend computes on create/update/
   *  list — /pwa/<jwt-token>, decoded server-side by GET /forms/pwa/:token.
   *  Not present on every response shape (e.g. the plain GET /forms/:id
   *  used by the builder when editing doesn't compute it). */
  link?: string;
}

export interface CreateApiFormPayload {
  title: string;
  description?: string;
  fields: ApiFormField[];
  design?: ApiFormDesign;
  isActive?: boolean;
  purpose?: "lead_creation" | "lead_update" | "generic";
  onSuccessTransition?: {
    queueId?: string;
    stageId?: string;
    stepId?: string;
  };
}

export type UpdateApiFormPayload = Partial<CreateApiFormPayload>;

export interface ApiFormSubmission {
  id: string;
  formId: string;
  leadId?: string | null;
  customerId?: string | null;
  answers: Record<string, unknown>;
  submittedAt: string;
}

export function getForms() {
  return apiRequest<ApiForm[]>({
    method: "GET",
    url: API_ENDPOINTS.forms.list,
  });
}

export function getForm(id: string) {
  return apiRequest<ApiForm>({
    method: "GET",
    url: API_ENDPOINTS.forms.detail(id),
  });
}

export function createForm(payload: CreateApiFormPayload) {
  return apiRequest<ApiForm>({
    method: "POST",
    url: API_ENDPOINTS.forms.create,
    data: payload,
  });
}

export function updateForm(id: string, payload: UpdateApiFormPayload) {
  return apiRequest<ApiForm>({
    method: "PUT",
    url: API_ENDPOINTS.forms.update(id),
    data: payload,
  });
}

export function deleteForm(id: string) {
  return apiRequest<void>({
    method: "DELETE",
    url: API_ENDPOINTS.forms.delete(id),
  });
}

/** Public, unauthenticated — used by the public form-rendering page. */
export function getPublicForm(id: string) {
  return apiRequest<ApiForm>({
    method: "GET",
    url: API_ENDPOINTS.forms.public(id),
  });
}

export interface ApiFormByToken {
  form: ApiForm;
  /** Set when the link was generated scoped to a specific lead (e.g. a
   *  lead_update form sent to one contact) — null for a form's generic
   *  share link. */
  leadId: string | null;
}

/** Public, unauthenticated — resolves the signed /pwa/:token link (the
 *  one the backend hands back as each form's `link`) into the form it
 *  points to. This is the real share-link flow; GET /forms/public/:id
 *  (used by getPublicForm) takes a raw form id instead and has no token
 *  verification. */
export function getFormByToken(token: string) {
  return apiRequest<ApiFormByToken>({
    method: "GET",
    url: API_ENDPOINTS.forms.pwa(token),
  });
}

/** Public, unauthenticated. For `lead_creation`/`lead_update` purpose
 *  forms, the backend creates/updates the Lead itself from `answers`
 *  (matched via each field's `mapTo`) — the frontend never calls
 *  leadsApi directly for this. */
export function submitPublicForm(
  id: string,
  payload: { leadId?: string; answers: Record<string, unknown> },
) {
  return apiRequest<ApiFormSubmission>({
    method: "POST",
    url: API_ENDPOINTS.forms.publicSubmit(id),
    data: payload,
  });
}
