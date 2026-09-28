export type StagePhaseKind = "active" | "warning" | "unassigned" | "at-risk";

export interface StagePhase {
  label: string;
  kind: StagePhaseKind;
}

export interface LeadRecord {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  suburb: string | null;
  state: string | null;
  postcode: string | null;
  avatarColor: string;
  stagePhase: StagePhase;
  queue: string | null;
  queueId: string | null;
  stageId: string | null;
}
