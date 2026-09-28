export type DateRangePreset = "7d" | "30d" | "90d" | "custom";

export interface DateRangeValue {
  preset: DateRangePreset;
  /** ISO date-time strings — sent straight through as startDate/endDate to
   *  GET /leads/dashboard/stats. */
  startDate: string;
  endDate: string;
  label: string;
}

const PRESET_DAYS: Record<Exclude<DateRangePreset, "custom">, number> = {
  "7d": 7,
  "30d": 30,
  "90d": 90,
};

const PRESET_LABELS: Record<Exclude<DateRangePreset, "custom">, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
};

export function presetRange(preset: Exclude<DateRangePreset, "custom">): DateRangeValue {
  const end = new Date();
  const start = new Date(end.getTime() - PRESET_DAYS[preset] * 24 * 60 * 60 * 1000);
  return {
    preset,
    startDate: start.toISOString(),
    endDate: end.toISOString(),
    label: PRESET_LABELS[preset],
  };
}

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date: Date): Date {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function formatShort(date: Date): string {
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/** Builds a DateRangeValue from two Date objects picked in the calendar.
 *  If the picked range happens to match one of the day-count presets
 *  (within a day of tolerance, since the calendar snaps to day
 *  boundaries rather than "now") it's labeled the same as picking that
 *  preset from the menu would — otherwise it gets a plain "MMM d – MMM d"
 *  label. */
export function rangeFromDates(start: Date, end: Date): DateRangeValue {
  const from = startOfDay(start);
  const to = endOfDay(end);
  const spanDays = Math.round((to.getTime() - from.getTime()) / ONE_DAY_MS);
  const isRecent = to.getTime() >= Date.now() - ONE_DAY_MS;

  if (isRecent) {
    const matchedPreset = (Object.keys(PRESET_DAYS) as Exclude<DateRangePreset, "custom">[]).find(
      (preset) => spanDays === PRESET_DAYS[preset],
    );
    if (matchedPreset) {
      return presetRange(matchedPreset);
    }
  }

  return {
    preset: "custom",
    startDate: from.toISOString(),
    endDate: to.toISOString(),
    label: `${formatShort(from)} – ${formatShort(to)}`,
  };
}

export const DEFAULT_DASHBOARD_RANGE = presetRange("7d");
