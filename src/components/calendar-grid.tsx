"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { MoveHorizontal } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DAY_HEIGHT_PX,
  DAY_START_HOUR,
  PX_PER_MIN,
  dateFromDayOffset,
  formatTimeRange,
  gridLines,
  hourMarks,
  layoutDay,
  minutesFromDayStart,
  snapMinutes,
  type AppointmentWithCustomer,
} from "@/lib/salon";
import { rescheduleAppointment } from "@/app/actions";

interface Props {
  days: Date[];
  appointments: AppointmentWithCustomer[];
  showCancelled: boolean;
  showNow: boolean;
  onApptClick: (appt: AppointmentWithCustomer) => void;
  onCreateAt: (day: Date, start: Date) => void;
}

interface DragState {
  id: number;
  /** pixel offset of the grab point from the top of the block */
  grabOffsetY: number;
  /** live preview, computed on each move */
  dayIndex: number;
  minutesFromOpen: number;
  lengthMin: number;
  customerName: string;
  moved: boolean;
}

const DRAG_THRESHOLD = 5;

export function CalendarGrid({
  days,
  appointments,
  showCancelled,
  showNow,
  onApptClick,
  onCreateAt,
}: Props) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);
  const columnsRef = useRef<HTMLDivElement>(null);
  const [drag, setDrag] = useState<DragState | null>(null);
  // Track whether the pointer actually moved, to tell a click from a drag.
  const movedRef = useRef(false);
  const startPtRef = useRef<{ x: number; y: number } | null>(null);
  // After a drag-drop the browser fires a click that bubbles to the column
  // background; this flag swallows that one click so it doesn't open the
  // "new appointment" dialog.
  const suppressColumnClickRef = useRef(false);

  function pointerToGrid(e: PointerEvent | React.PointerEvent) {
    const cols = columnsRef.current!;
    const rect = cols.getBoundingClientRect();
    const colWidth = rect.width / days.length;
    let dayIndex = Math.floor((e.clientX - rect.left) / colWidth);
    dayIndex = Math.max(0, Math.min(days.length - 1, dayIndex));
    const yInContent = e.clientY - rect.top;
    return { dayIndex, yInContent };
  }

  function beginDrag(
    e: React.PointerEvent,
    appt: AppointmentWithCustomer,
    blockTop: number,
  ) {
    if (appt.status === "cancelled") return; // don't drag cancelled
    movedRef.current = false;
    startPtRef.current = { x: e.clientX, y: e.clientY };
    const { yInContent } = pointerToGrid(e);
    const grabOffsetY = yInContent - blockTop;

    const initial: DragState = {
      id: appt.id,
      grabOffsetY,
      dayIndex: days.findIndex((d) => isSameDay(d, appt.startsAt)),
      minutesFromOpen: minutesFromDayStart(appt.startsAt),
      lengthMin: appt.lengthMin,
      customerName: appt.customer.name,
      moved: Boolean(appt.originalStartsAt),
    };

    const onMove = (ev: PointerEvent) => {
      const start = startPtRef.current!;
      // Ignore small jitters: only treat it as a drag once the pointer has
      // clearly moved. Until then we show no drag visual, so a click stays a
      // click.
      if (
        !movedRef.current &&
        Math.abs(ev.clientX - start.x) <= DRAG_THRESHOLD &&
        Math.abs(ev.clientY - start.y) <= DRAG_THRESHOLD
      ) {
        return;
      }
      movedRef.current = true;
      const { dayIndex, yInContent } = pointerToGrid(ev);
      const minutes = snapMinutes((yInContent - grabOffsetY) / PX_PER_MIN);
      setDrag({ ...initial, dayIndex, minutesFromOpen: minutes });
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      if (!movedRef.current) {
        setDrag(null);
        onApptClick(appt); // it was a tap/click, not a drag
        return;
      }

      // A real drag just ended — ignore the click the browser fires next so it
      // doesn't open the new-appointment dialog on the column underneath.
      suppressColumnClickRef.current = true;
      setTimeout(() => {
        suppressColumnClickRef.current = false;
      }, 0);

      const { dayIndex, yInContent } = pointerToGrid(ev);
      const minutes = snapMinutes((yInContent - grabOffsetY) / PX_PER_MIN);
      const targetDay = days[dayIndex];
      const newStart = dateFromDayOffset(targetDay, minutes);
      setDrag(null);

      if (newStart.getTime() === appt.startsAt.getTime()) return;
      void rescheduleAppointment(appt.id, newStart.getTime())
        .then(() => {
          toast.success(
            `Moved ${appt.customer.name} to ${format(newStart, "EEE h:mmaaa")}`,
          );
          router.refresh();
        })
        .catch(() => toast.error("Could not move appointment"));
    };

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  }

  function handleColumnClick(e: React.MouseEvent, day: Date) {
    // Swallow the click that immediately follows a drag-drop.
    if (suppressColumnClickRef.current) {
      suppressColumnClickRef.current = false;
      return;
    }
    // Only fire for clicks on the empty background, not on an appointment.
    if (e.target !== e.currentTarget) return;
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const minutes = snapMinutes((e.clientY - rect.top) / PX_PER_MIN);
    onCreateAt(day, dateFromDayOffset(day, minutes));
  }

  const now = new Date();
  const nowTop = (minutesFromDayStart(now)) * PX_PER_MIN;
  const nowVisible = showNow && nowTop >= 0 && nowTop <= DAY_HEIGHT_PX;

  return (
    <div ref={scrollRef} className="flex-1 overflow-auto">
      <div className="flex min-w-fit">
        {/* Hour gutter */}
        <div className="sticky left-0 z-20 w-12 shrink-0 bg-background sm:w-14">
          <div className="h-10 border-b" /> {/* header spacer */}
          <div className="relative" style={{ height: DAY_HEIGHT_PX }}>
            {hourMarks().map((m) => (
              <div
                key={m.hour}
                className="absolute right-1 -translate-y-1/2 text-[10px] text-muted-foreground sm:text-xs"
                style={{ top: m.top }}
              >
                {format(new Date().setHours(m.hour, 0), "ha")}
              </div>
            ))}
          </div>
        </div>

        {/* Day columns */}
        <div ref={columnsRef} className="flex flex-1">
          {days.map((day, dayIndex) => {
            const isToday = isSameDay(day, now);
            const dayAppts = appointments
              .filter((a) => isSameDay(a.startsAt, day))
              .filter((a) => showCancelled || a.status !== "cancelled");

            // While dragging, lay the day out as if the dragged appointment
            // were at its live drop position: removed from its origin day and
            // added (as a placeholder) to the target day. This makes the
            // appointments underneath narrow into lanes to make room. The
            // placeholder itself is skipped when rendering (the floating ghost
            // represents it).
            let forLayout = dayAppts;
            if (drag) {
              forLayout = dayAppts.filter((a) => a.id !== drag.id);
              if (isSameDay(day, days[drag.dayIndex])) {
                forLayout = [
                  ...forLayout,
                  {
                    id: drag.id,
                    startsAt: dateFromDayOffset(day, drag.minutesFromOpen),
                    lengthMin: drag.lengthMin,
                  } as unknown as AppointmentWithCustomer,
                ];
              }
            }
            const laid = layoutDay(forLayout);

            return (
              <div
                key={day.toISOString()}
                className="flex min-w-[120px] flex-1 flex-col border-l"
              >
                {/* Day header */}
                <div
                  className={cn(
                    "sticky top-0 z-10 flex h-10 flex-col items-center justify-center border-b bg-background text-xs",
                    isToday && "bg-primary/5",
                  )}
                >
                  <span className="text-muted-foreground">
                    {format(day, "EEE")}
                  </span>
                  <span
                    className={cn(
                      "font-semibold",
                      isToday &&
                        "flex size-5 items-center justify-center rounded-full bg-primary text-primary-foreground",
                    )}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Column body */}
                <div
                  className="relative cursor-copy"
                  style={{ height: DAY_HEIGHT_PX }}
                  onClick={(e) => handleColumnClick(e, day)}
                >
                  {/* grid lines: light at 15-min, darker on the hour */}
                  {gridLines().map((g) => (
                    <div
                      key={g.top}
                      className={cn(
                        "pointer-events-none absolute inset-x-0 border-t",
                        g.major
                          ? "border-gray-300 dark:border-gray-700"
                          : "border-gray-200/70 dark:border-gray-800/60",
                      )}
                      style={{ top: g.top }}
                    />
                  ))}

                  {/* now indicator */}
                  {nowVisible && isToday && (
                    <div
                      className="pointer-events-none absolute inset-x-0 z-10 border-t-2 border-red-500"
                      style={{ top: nowTop }}
                    >
                      <div className="absolute -left-1 -top-1 size-2 rounded-full bg-red-500" />
                    </div>
                  )}

                  {/* appointments */}
                  {laid.map(({ appt, top, height, lane, lanes, span }) => {
                    // The dragged appointment is shown by the floating ghost,
                    // so skip its in-grid card while dragging.
                    if (drag?.id === appt.id) return null;
                    const cancelled = appt.status === "cancelled";
                    const unconfirmed = appt.status === "unconfirmed";
                    const moved = Boolean(appt.originalStartsAt);
                    const leftPct = (lane / lanes) * 100;
                    const widthPct = (span / lanes) * 100;
                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onPointerDown={(e) => beginDrag(e, appt, top)}
                        className={cn(
                          "absolute overflow-hidden rounded-md border border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-colors",
                          "touch-none select-none",
                          cancelled
                            ? "border-gray-300 border-l-gray-400 bg-gray-100 text-gray-500 line-through dark:border-gray-700 dark:border-l-gray-600 dark:bg-gray-800/60 dark:text-gray-400"
                            : unconfirmed
                              ? "border-yellow-300 border-l-yellow-400 bg-yellow-100 text-yellow-950 hover:bg-yellow-200 dark:border-yellow-900 dark:border-l-yellow-600 dark:bg-yellow-950/40 dark:text-yellow-100"
                              : "border-green-300 border-l-green-500 bg-green-100 text-green-950 hover:bg-green-200 dark:border-green-900 dark:border-l-green-600 dark:bg-green-950/40 dark:text-green-100",
                        )}
                        style={{
                          top,
                          height,
                          left: `calc(${leftPct}% + 1px)`,
                          width: `calc(${widthPct}% - 2px)`,
                          zIndex: 5,
                        }}
                      >
                        <div className="truncate font-semibold">
                          {appt.customer.name}
                        </div>
                        {height > 30 && (
                          <div className="flex items-center gap-1 opacity-80">
                            <span className="truncate">
                              {formatTimeRange(appt.startsAt, appt.lengthMin)}
                            </span>
                            {moved && !cancelled && (
                              <MoveHorizontal
                                aria-label="Rescheduled"
                                className="size-3 shrink-0 text-amber-600"
                              />
                            )}
                          </div>
                        )}
                        {height > 52 && appt.notes && (
                          <div className="truncate opacity-70">{appt.notes}</div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Drag ghost */}
      {drag && (
        <DragGhost
          drag={drag}
          columnsEl={columnsRef.current}
          days={days}
          appointments={appointments}
          showCancelled={showCancelled}
        />
      )}
    </div>
  );
}

/** Floating preview shown while dragging an appointment. */
function DragGhost({
  drag,
  columnsEl,
  days,
  appointments,
  showCancelled,
}: {
  drag: DragState;
  columnsEl: HTMLDivElement | null;
  days: Date[];
  appointments: AppointmentWithCustomer[];
  showCancelled: boolean;
}) {
  if (!columnsEl) return null;
  const rect = columnsEl.getBoundingClientRect();
  const colWidth = rect.width / days.length;
  const targetDay = days[drag.dayIndex];
  const start = dateFromDayOffset(targetDay, drag.minutesFromOpen);

  // Lay the dragged appointment out alongside the others on the target day (at
  // its new position) so it narrows into a lane when it overlaps something.
  const others = appointments
    .filter((a) => isSameDay(a.startsAt, targetDay))
    .filter((a) => showCancelled || a.status !== "cancelled")
    .filter((a) => a.id !== drag.id);
  const ghostAppt = {
    id: drag.id,
    startsAt: start,
    lengthMin: drag.lengthMin,
  } as unknown as AppointmentWithCustomer;
  const laid = layoutDay([...others, ghostAppt]);
  const mine = laid.find((l) => l.appt.id === drag.id);
  const lanes = mine?.lanes ?? 1;
  const lane = mine?.lane ?? 0;
  const span = mine?.span ?? 1;

  const unit = colWidth / lanes;
  const left = rect.left + drag.dayIndex * colWidth + lane * unit + 1;
  const width = span * unit - 2;
  const top = rect.top + drag.minutesFromOpen * PX_PER_MIN;

  return (
    <>
      {/* Drop-target time, shown just above the dragged card */}
      <div
        className="pointer-events-none fixed z-50 -translate-x-1/2 -translate-y-full rounded-md bg-foreground px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap text-background shadow-md"
        style={{ left: left + width / 2, top: top - 4 }}
      >
        {format(start, "EEE h:mmaaa")}
      </div>

      {/* The dragged card */}
      <div
        className="pointer-events-none fixed z-50 overflow-hidden rounded-md border-2 border-primary bg-primary/30 px-1.5 py-1 text-[11px] font-semibold shadow-lg backdrop-blur-sm"
        style={{
          left,
          top,
          width,
          height: Math.max(drag.lengthMin * PX_PER_MIN, 18),
        }}
      >
        <div className="truncate">{drag.customerName}</div>
      </div>
    </>
  );
}
