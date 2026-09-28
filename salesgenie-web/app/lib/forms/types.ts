export type FormFieldType =
  | "text"
  | "email"
  | "phone"
  | "textarea"
  | "select"
  | "checkbox"
  | "radio"
  | "date";

/** When set, this field's answer maps directly onto the real Lead record
 *  created from a submission (see formsStore.submitPublicForm). Fields
 *  without a key are still captured on the submission but have nowhere to
 *  go on the Lead entity today. */
export type WellKnownFieldKey =
  | "firstName"
  | "lastName"
  | "email"
  | "phoneNumber"
  | "suburb"
  | "state"
  | "postcode";

export interface FormFieldOption {
  label: string;
  value: string;
}

export interface FormFieldDef {
  id: string;
  key?: WellKnownFieldKey;
  label: string;
  type: FormFieldType;
  required: boolean;
  /** false = this field joins the row of the field right before it in the
   *  list, letting a row hold 2+ fields side by side. Omitted/true = it
   *  starts a fresh row. The very first field is always a new row. */
  newRow?: boolean;
  placeholder?: string;
  options?: FormFieldOption[];
}

/** Visual design for the public-facing form — sent to the backend alongside
 *  the field schema so the rendered link matches what was built. */
export interface FormTheme {
  accentColor: string;
  logoUrl?: string;
  titleAlign: "left" | "center";
}

export const DEFAULT_FORM_THEME: FormTheme = {
  accentColor: "#1A73E8",
  titleAlign: "center",
};

/** Forms are addressed purely by `id` — the backend has no slug concept,
 *  so public links are `/f/<id>`. */
export interface FormDefinition {
  id: string;
  name: string;
  description: string;
  theme: FormTheme;
  fields: FormFieldDef[];
  createdAt: string;
  updatedAt: string;
  /** The backend-issued /pwa/<token> share link — see ApiForm.link. Not
   *  always present (e.g. a plain single-form fetch by id). */
  link?: string;
}

export interface CreateFormPayload {
  name: string;
  description?: string;
  theme?: FormTheme;
  /** Each field's `id` is sent to (and persisted by) the backend as its
   *  stable identity, so editing a form doesn't reshuffle which answer
   *  key a field's submissions are recorded under. */
  fields: FormFieldDef[];
}

export type UpdateFormPayload = Partial<CreateFormPayload>;

export interface FormSubmission {
  id: string;
  formId: string;
  values: Record<string, string>;
  /** Set when the submission had enough well-known fields to create a real
   *  Lead via the public-register endpoint. */
  createdLeadId: string | null;
  submittedAt: string;
}
