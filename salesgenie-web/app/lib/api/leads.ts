import { apiRequest } from "./client";
import { API_ENDPOINTS } from "./endpoints";
import type {
  AllocateLeadsPayload,
  ConvertLeadPayload,
  CreateLeadPayload,
  CreatePublicLeadPayload,
  Customer,
  DashboardStats,
  GetCustomersParams,
  GetLeadsParams,
  Lead,
  LeadDetails,
  UpdateCustomerPayload,
  UpdateLeadPayload,
} from "./types";

export function getLeads(params?: GetLeadsParams) {
  return apiRequest<Lead[]>({
    method: "GET",
    url: API_ENDPOINTS.leads.list,
    params,
  });
}

export function createLead(payload: CreateLeadPayload) {
  return apiRequest<Lead>({
    method: "POST",
    url: API_ENDPOINTS.leads.create,
    data: payload,
  });
}

/** The rich detail endpoint — lead fields plus its resolved current
 *  queue/stage/step, not just raw ids. */
export function getLeadDetails(id: string) {
  return apiRequest<LeadDetails>({
    method: "GET",
    url: API_ENDPOINTS.leads.detail(id),
  });
}

/** Basic-info edits (name/email/phone/suburb/state/postcode/notes). To
 *  reassign queue/stage, use moveLead instead — it resolves a default
 *  stage/step, fires the step's auto-execute action, and logs a
 *  transition, none of which this plain field-patch endpoint does. */
export function updateLead(id: string, payload: UpdateLeadPayload) {
  return apiRequest<Lead>({
    method: "PATCH",
    url: API_ENDPOINTS.leads.update(id),
    data: payload,
  });
}

/** Content-Type is left unset so the browser adds the multipart boundary
 *  itself — see storage.ts's uploadFile for why. Appends to the lead's
 *  attachments list server-side rather than replacing it. */
export function uploadLeadAttachment(id: string, file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return apiRequest<Lead>({
    method: "POST",
    url: API_ENDPOINTS.leads.uploadAttachment(id),
    data: formData,
    headers: { "Content-Type": undefined },
  });
}

/** Public, unauthenticated — the same endpoint an embedded website contact
 *  form would hit. Used by the public form-submission page. */
export function registerPublicLead(payload: CreatePublicLeadPayload) {
  return apiRequest<Lead>({
    method: "POST",
    url: API_ENDPOINTS.leads.publicRegister,
    data: payload,
  });
}

export function getDashboardStats(params?: { startDate?: string; endDate?: string }) {
  return apiRequest<DashboardStats>({
    method: "GET",
    url: API_ENDPOINTS.leads.dashboardStats,
    params,
  });
}

export function allocateLeads(payload: AllocateLeadsPayload) {
  return apiRequest<Lead[]>({
    method: "POST",
    url: API_ENDPOINTS.leads.allocate,
    data: payload,
  });
}

/** buttonIds, when provided, limits which of the step's buttons get
 *  embedded as clickable links in the sent email. Omit to include all. */
export function executeAction(leadId: string, buttonIds?: string[]) {
  return apiRequest<unknown>({
    method: "POST",
    url: API_ENDPOINTS.leads.executeAction(leadId),
    data: buttonIds && buttonIds.length > 0 ? { buttonIds } : undefined,
  });
}

/** Simulates the lead clicking one of the current step's buttons — fires
 *  that button's configured transition and actually moves the lead. */
export function clickButton(leadId: string, buttonId: string) {
  return apiRequest<Lead>({
    method: "POST",
    url: API_ENDPOINTS.leads.clickButton(leadId),
    data: { buttonId },
  });
}

/** Repositions the lead. Note: the backend auto-fires execute-action (no
 *  buttonIds filter) in the background right after moving — don't also call
 *  executeAction yourself for the same send, or it'll go out twice. */
export function moveLead(
  leadId: string,
  payload: { queueId?: string; stageId?: string; stepId?: string },
) {
  return apiRequest<Lead>({
    method: "POST",
    url: API_ENDPOINTS.leads.move(leadId),
    data: payload,
  });
}

export function getCustomers(params?: GetCustomersParams) {
  return apiRequest<Customer[]>({
    method: "GET",
    url: API_ENDPOINTS.leads.customers,
    params,
  });
}

export function getCustomerDetails(id: string) {
  return apiRequest<Customer>({
    method: "GET",
    url: API_ENDPOINTS.leads.customerDetail(id),
  });
}

export function updateCustomer(id: string, payload: UpdateCustomerPayload) {
  return apiRequest<Customer>({
    method: "PATCH",
    url: API_ENDPOINTS.leads.customerUpdate(id),
    data: payload,
  });
}

export function convertLead(leadId: string, payload?: ConvertLeadPayload) {
  return apiRequest<Customer>({
    method: "POST",
    url: API_ENDPOINTS.leads.convert(leadId),
    data: payload,
  });
}
