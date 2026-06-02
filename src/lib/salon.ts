import {
  addDays,
  addMinutes,
  differenceInMinutes,
  startOfDay,
  startOfWeek,
} from "date-fns";
import type { Appointment, Customer } from "@/db/schema";

/** Salon opening hours and grid granularity. */
export const DAY_START_HOUR = 8;
export const DAY_END_HOUR = 20;
export const SLOT_MIN = 5; // snapping / increment granularity
export const PX_PER_MIN = 1.4; // vertical scale of the calendar
export const MIN_LENGTH = 20;
export const MAX_LENGTH = 120;

export const DAY_MINUTES = (DAY_END_HOUR - DAY_START_HOUR) * 60;
export const DAY_HEIGHT_PX = DAY_MINUTES * PX_PER_MIN;

/** Selectable appointment lengths: 20–120 min in 5-min increments. */
export const LENGTH_OPTIONS: number[] = Array.from(
  { length: (MAX_LENGTH - MIN_LENGTH) / SLOT_MIN + 1 },
  (_, i) => MIN_LENGTH + i * SLOT_MIN,
);

/** Minutes from the top of the visible day for a given Date. */
export function minutesFromDayStart(date: Date): number {
  const dayStart = startOfDay(date);
  const open = addMinutes(dayStart, DAY_START_HOUR * 60);
  return differenceInMinutes(date, open);
}

/** Vertical pixel offset for a Date within its day column. */
export function topPx(date: Date): number {
  return minutesFromDayStart(date) * PX_PER_MIN;
}

export function heightPx(lengthMin: number): number {
  return lengthMin * PX_PER_MIN;
}

/** Snap a number of minutes-from-open to the nearest SLOT_MIN, clamped to the day. */
export function snapMinutes(minutesFromOpen: number): number {
  const snapped = Math.round(minutesFromOpen / SLOT_MIN) * SLOT_MIN;
  return Math.max(0, Math.min(DAY_MINUTES - SLOT_MIN, snapped));
}

/** Build a Date from a day and a snapped minutes-from-open offset. */
export function dateFromDayOffset(day: Date, minutesFromOpen: number): Date {
  const open = addMinutes(startOfDay(day), DAY_START_HOUR * 60);
  return addMinutes(open, minutesFromOpen);
}

export function weekStart(date: Date): Date {
  return startOfWeek(date, { weekStartsOn: 1 }); // Monday
}

export function weekDays(date: Date): Date[] {
  const start = weekStart(date);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

/** Hour labels shown down the left gutter. */
export function hourMarks(): { hour: number; top: number }[] {
  const marks: { hour: number; top: number }[] = [];
  for (let h = DAY_START_HOUR; h <= DAY_END_HOUR; h++) {
    marks.push({ hour: h, top: (h - DAY_START_HOUR) * 60 * PX_PER_MIN });
  }
  return marks;
}

/**
 * Horizontal grid lines at 15-minute intervals. `major` is true on the hour,
 * letting the UI draw hour lines darker than the quarter-hour lines.
 */
export function gridLines(): { top: number; major: boolean }[] {
  const lines: { top: number; major: boolean }[] = [];
  for (let minutes = 0; minutes <= DAY_MINUTES; minutes += 15) {
    lines.push({ top: minutes * PX_PER_MIN, major: minutes % 60 === 0 });
  }
  return lines;
}

export type AppointmentWithCustomer = Appointment & { customer: Customer };

/** An appointment positioned for rendering, plus its horizontal lane. */
export interface LaidOutAppointment {
  appt: AppointmentWithCustomer;
  top: number;
  height: number;
  /** 0-based starting column within its overlap cluster. */
  lane: number;
  /** Total number of columns in its overlap cluster. */
  lanes: number;
  /** How many columns this appointment spans (it expands across columns that
   * have nothing overlapping it, so non-overlapping bookings stay wide). */
  span: number;
}

/**
 * Lay out a day's appointments into horizontal lanes so overlapping bookings
 * sit side by side instead of stacking on top of each other.
 *
 * Cancelled appointments are included in layout only when `includeCancelled`
 * is true; the caller decides visibility.
 */
export function layoutDay(
  appts: AppointmentWithCustomer[],
): LaidOutAppointment[] {
  const sorted = [...appts].sort(
    (a, b) => a.startsAt.getTime() - b.startsAt.getTime(),
  );

  const result: LaidOutAppointment[] = [];
  // Process in clusters of mutually-overlapping appointments.
  let cluster: AppointmentWithCustomer[] = [];
  let clusterEnd = 0;

  const flush = () => {
    if (cluster.length === 0) return;
    // Greedy column assignment within the cluster.
    const laneEnds: number[] = []; // end time (ms) of last appt in each lane
    const placed = cluster.map((item) => {
      const start = item.startsAt.getTime();
      const end = start + item.lengthMin * 60_000;
      let lane = laneEnds.findIndex((e) => e <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      return { item, start, end, lane };
    });
    const lanes = laneEnds.length;
    for (const p of placed) {
      // Expand rightwards across any columns that hold nothing overlapping this
      // appointment's own time span. This keeps a booking full/wide unless it
      // genuinely overlaps another — rather than inheriting the whole cluster's
      // peak column count.
      let span = 1;
      for (let c = p.lane + 1; c < lanes; c++) {
        const blocked = placed.some(
          (q) => q.lane === c && q.start < p.end && q.end > p.start,
        );
        if (blocked) break;
        span++;
      }
      result.push({
        appt: p.item,
        top: topPx(p.item.startsAt),
        height: Math.max(heightPx(p.item.lengthMin), 18),
        lane: p.lane,
        lanes,
        span,
      });
    }
    cluster = [];
    clusterEnd = 0;
  };

  for (const appt of sorted) {
    const start = appt.startsAt.getTime();
    const end = start + appt.lengthMin * 60_000;
    if (cluster.length > 0 && start >= clusterEnd) {
      flush();
    }
    cluster.push(appt);
    clusterEnd = Math.max(clusterEnd, end);
  }
  flush();

  return result;
}

export function formatTimeRange(start: Date, lengthMin: number): string {
  const end = addMinutes(start, lengthMin);
  const fmt = (d: Date) =>
    d.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  return `${fmt(start)} – ${fmt(end)}`;
}
