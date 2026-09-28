export type TrendDirection = "up" | "down";

export interface StatCardData {
  id: string;
  value: string;
  label: string;
  trendLabel: string;
  trendDirection: TrendDirection;
  icon: "people" | "personAdd" | "run";
}

export type EmailButtonAction = "specific-stage" | "convert-customer" | "do-nothing";

export interface EmailActionButton {
  id: string;
  label: string;
  action: EmailButtonAction;
  /** Only meaningful when action is "specific-stage" — the chosen stage's
   *  id and display name (name cached here so the chip can show "Go to
   *  stage X" without re-resolving it from a list at render time).
   *  Reachable either directly ("Go to stage", scoped to the step's own
   *  queue) or by browsing ("Go to queue" > a queue > one of its stages) —
   *  either path ends up here, since the backend resolves a stage's own
   *  queue on its own and there's no separate "queue only" outcome. */
  targetStageId?: string;
  targetStageName?: string;
  /** Only set when the stage was picked via "Go to queue" > a queue > one
   *  of its stages — display-only, so the chip can distinguish "Go to
   *  stage X" (picked directly, current queue) from "Go to queue Y X"
   *  (picked by browsing into a different queue first). Not sent to the
   *  backend — the transition only needs targetStageId. */
  targetQueueName?: string;
}

export interface EmailTemplate {
  to: string;
  cc: string;
  bcc: string;
  subject: string;
  bodyHtml: string;
  videoUrl: string;
  attachmentUrl: string;
  buttons: EmailActionButton[];
  /** Editable sign-off shown below the action buttons in the step editor —
   *  sent to the backend as its own field (actionContent.metadata.regards),
   *  which appends it as a real email footer server-side rather than
   *  baking it into `body` (see lead.service.ts's executeAction). */
  signature: string;
}

/** Matches backend reality — it only ever sends subject/body for this step
 *  type too, no real .ics/scheduling mechanism exists. */
export interface CalendarInvite {
  title: string;
  description: string;
}
