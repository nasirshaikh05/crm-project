export interface LeadAttachment {
  name: string;
  url: string;
  size: number;
  uploadedAt: string;
}

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  currentQueueId?: string;
  currentStageId?: string;
  currentStepId?: string;
  notes?: string | null;
  attachments?: LeadAttachment[] | null;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateLeadPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phoneNumber?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  status?: string;
  currentQueueId?: string;
  currentStageId?: string;
  currentStepId?: string;
  notes?: string;
}

export interface GetLeadsParams {
  status?: string;
  queueId?: string;
  stageId?: string;
  stepId?: string;
  allocation?: "allocated" | "unallocated" | "all";
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "date" | "createdAt";
  sortOrder?: "ASC" | "DESC";
  startDate?: string;
  endDate?: string;
}

export interface CreateLeadPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  sendEmail?: boolean;
  sendSms?: boolean;
  sendWhatsapp?: boolean;
  currentQueueId?: string;
  currentStageId?: string;
  currentStepId?: string;
}

export interface CreatePublicLeadPayload {
  firstName: string;
  lastName: string;
  email: string;
  phoneNumber: string;
}

export interface Customer {
  id: string;
  convertedFromLeadId?: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  suburb?: string | null;
  state?: string | null;
  postcode?: string | null;
  currentQueueId?: string;
  currentStageId?: string;
  currentStepId?: string;
  accountManagerId?: string;
  contractStartDate?: string;
  status: string;
  convertedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateCustomerPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  suburb?: string;
  state?: string;
  postcode?: string;
  status?: string;
  currentQueueId?: string;
  currentStageId?: string;
  currentStepId?: string;
  accountManagerId?: string;
  contractStartDate?: string;
}

export interface GetCustomersParams {
  status?: string;
  queueId?: string;
  stageId?: string;
  stepId?: string;
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: "convertedAt" | "createdAt" | "updatedAt" | "firstName" | "lastName" | "contractStartDate";
  sortOrder?: "ASC" | "DESC";
  startDate?: string;
  endDate?: string;
}

export interface ConvertLeadPayload {
  accountManagerId?: string;
  contractStartDate?: string;
}

/** POST /auth/register's response shape — a bare user record, no
 *  workspaceId/workspaceName (those only exist once a session/token is
 *  issued via login). */
export interface RegisteredUser {
  id: string;
  email: string;
  workspace: string | null;
  createdAt: string;
  updatedAt: string;
}

/** The session/token-bearing shape — what's actually stored client-side
 *  and returned by POST /auth/login as `user`. firstName/lastName aren't
 *  part of the login response itself — they're merged in client-side
 *  after a GET /users/me call (see session.ts's updateSessionProfile). */
export interface AuthUser {
  id: string;
  email: string;
  workspaceId: string;
  workspaceName: string;
  firstName?: string | null;
  lastName?: string | null;
}

/** GET/PATCH /users/me response shape (passwordHash stripped server-side). */
export interface UserProfile {
  id: string;
  email: string;
  firstName: string | null;
  lastName: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUserPayload {
  firstName?: string;
  lastName?: string;
  email?: string;
  password?: string;
}

export interface RegisterPayload {
  email: string;
  password: string;
  workspace?: string;
}

export interface LoginPayload {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: AuthUser;
}

/** POST /auth/switch-workspace only returns fresh tokens — no user object,
 *  since the caller already knows which workspace it switched to. */
export interface SwitchWorkspaceTokens {
  accessToken: string;
  refreshToken: string;
}

/** POST /auth/refresh's response shape — same as SwitchWorkspaceTokens,
 *  named separately since it's a distinct endpoint/use case. */
export interface RefreshTokens {
  accessToken: string;
  refreshToken: string;
}

export interface Workspace {
  id: string;
  name: string;
  logoUrl?: string | null;
  orgName?: string | null;
  userId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWorkspacePayload {
  name: string;
  orgName?: string;
  logoUrl?: string;
}

export type UpdateWorkspacePayload = Partial<CreateWorkspacePayload>;

export interface DashboardStatTrend {
  value: number;
  changePercentage: number;
  trend: "up" | "down";
}

export interface DashboardChartPoint {
  date: string;
  leads: number;
  comparison: number;
}

export interface DashboardStats {
  totalLeads: DashboardStatTrend;
  newLeads: DashboardStatTrend;
  avgConversion: DashboardStatTrend;
  quarterlyTarget: {
    target: number;
    current: number;
    percentage: number;
  };
  chartData: DashboardChartPoint[];
  workspaceName: string;
  workspaceLogo: string | null;
}

export interface LeadAllocation {
  leadId: string;
  queueId?: string;
  stageId?: string;
}

export interface AllocateLeadsPayload {
  queueId?: string;
  stageId?: string;
  count?: number;
  leadIds?: string[];
  /** Assigns each lead its own queue/stage in a single request — used
   *  instead of queueId/stageId/count/leadIds when different leads go to
   *  different destinations. */
  allocations?: LeadAllocation[];
}

export type StepActionType =
  | "send_email_with_buttons"
  | "send_email_with_attachments"
  | "send_email_with_video"
  | "send_calendar_invite"
  | "send_email_with_form"
  | "send_agreement_for_signature"
  | "send_sms"
  | "go_to_next_step"
  | "go_to_next_stage"
  | "go_to_next_queue"
  | "convert_to_customer"
  | "do_nothing";

export type TransitionTargetType =
  | "next_step"
  | "next_stage"
  | "next_queue"
  | "specific_step"
  | "specific_stage"
  | "specific_queue"
  | "convert_to_customer"
  | "do_nothing";

export interface Queue {
  id: string;
  name: string;
  description: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateQueuePayload {
  name: string;
  description?: string;
  isActive?: boolean;
}

export type UpdateQueuePayload = Partial<CreateQueuePayload>;

export interface Stage {
  id: string;
  queueId: string;
  name: string;
  orderIndex: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateStagePayload {
  queueId: string;
  name: string;
  orderIndex: number;
}

export type UpdateStagePayload = Partial<Pick<CreateStagePayload, "name" | "orderIndex">>;

/** Shape varies by Step.actionType (email fields vs. SMS body vs. calendar fields, etc.). */
export interface StepActionContent {
  subject?: string;
  body?: string;
  attachmentUrl?: string;
  videoUrl?: string;
  metadata?: Record<string, unknown>;
  [key: string]: unknown;
}

/** stageId is nullable — a step created without one is a global/unassigned
 *  step, not scoped to any particular stage. */
export interface Step {
  id: string;
  stageId?: string | null;
  name: string;
  orderIndex: number;
  actionType: StepActionType;
  createdAt: string;
  updatedAt: string;
}

export interface StepButton {
  id: string;
  stepId: string;
  label: string;
  orderIndex: number;
  /** Only present on GET /steps/:id (findOneWithConfig) — null when the
   *  button has no configured transition yet. */
  transition?: ButtonTransition | null;
}

/** Returned by GET /steps/:id only — the list endpoint returns bare Steps. */
export interface StepDetail extends Step {
  actionContent: StepActionContent | null;
  buttons: StepButton[];
}

export interface CreateStepPayload {
  name: string;
  orderIndex: number;
  actionType: StepActionType;
  stageId?: string;
  actionContent?: StepActionContent;
}

export type UpdateStepPayload = Partial<CreateStepPayload>;

export interface CreateStepButtonPayload {
  label: string;
  orderIndex?: number;
}

export type UpdateStepButtonPayload = Partial<CreateStepButtonPayload>;

export interface ButtonTransition {
  id: string;
  buttonId: string;
  targetType: TransitionTargetType;
  targetStepId: string | null;
  targetStageId: string | null;
  targetQueueId: string | null;
  /** Resolved server-side (GET /steps/:id only) since the target stage can
   *  belong to a different queue than the step's own — the frontend only
   *  has that one queue's stages loaded, so it can't always resolve this
   *  itself. */
  targetStageName?: string | null;
  targetStageQueueId?: string | null;
}

export interface CreateButtonTransitionPayload {
  targetType: TransitionTargetType;
  targetStepId?: string;
  targetStageId?: string;
  targetQueueId?: string;
}

export interface LeadDetailButton {
  id: string;
  label: string;
  orderIndex: number;
  transition: {
    id: string;
    targetType: TransitionTargetType;
    targetStepId: string | null;
    targetStageId: string | null;
    targetQueueId: string | null;
  } | null;
}

/** GET /leads/:id's response shape — the lead itself plus its resolved
 *  current queue/stage/step (already joined server-side, so the details
 *  page doesn't need to separately look them up by id) and audit history.
 *  transitions/executions aren't modeled field-by-field since nothing
 *  reads them yet. */
export interface LeadDetails {
  lead: Lead;
  workflow: {
    queue: Queue | null;
    stage: Stage | null;
    step: Step | null;
    actionContent: StepActionContent | null;
    buttons: LeadDetailButton[];
  };
  transitions: unknown[];
  executions: unknown[];
}
