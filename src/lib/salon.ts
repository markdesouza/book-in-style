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

export type AppointmentWithCustomer = Appointment & { customer: Customer };

/** An appointment positioned for rendering, plus its horizontal lane. */
export interface LaidOutAppointment {
  appt: AppointmentWithCustomer;
  top: number;
  height: number;
  /** 0-based column within its overlap cluster. */
  lane: number;
  /** Total number of columns in its overlap cluster. */
  lanes: number;
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
    // Greedy lane assignment within the cluster.
    const laneEnds: number[] = []; // end time (ms) of last appt in each lane
    const assigned: { item: AppointmentWithCustomer; lane: number }[] = [];
    for (const item of cluster) {
      const start = item.startsAt.getTime();
      const end = start + item.lengthMin * 60_000;
      let lane = laneEnds.findIndex((e) => e <= start);
      if (lane === -1) {
        lane = laneEnds.length;
        laneEnds.push(end);
      } else {
        laneEnds[lane] = end;
      }
      assigned.push({ item, lane });
    }
    const lanes = laneEnds.length;
    for (const { item, lane } of assigned) {
      result.push({
        appt: item,
        top: topPx(item.startsAt),
        height: Math.max(heightPx(item.lengthMin), 18),
        lane,
        lanes,
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
