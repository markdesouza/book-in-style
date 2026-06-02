"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { format, isSameDay } from "date-fns";
import { MoveRight } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  DAY_HEIGHT_PX,
  DAY_START_HOUR,
  PX_PER_MIN,
  dateFromDayOffset,
  formatTimeRange,
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
      if (
        Math.abs(ev.clientX - start.x) > DRAG_THRESHOLD ||
        Math.abs(ev.clientY - start.y) > DRAG_THRESHOLD
      ) {
        movedRef.current = true;
      }
      const { dayIndex, yInContent } = pointerToGrid(ev);
      const minutes = snapMinutes((yInContent - grabOffsetY) / PX_PER_MIN);
      setDrag((d) =>
        d ? { ...d, dayIndex, minutesFromOpen: minutes } : d,
      );
    };

    const onUp = (ev: PointerEvent) => {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);

      if (!movedRef.current) {
        setDrag(null);
        onApptClick(appt); // it was a tap/click, not a drag
        return;
      }

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
    setDrag(initial);
  }

  function handleColumnClick(e: React.MouseEvent, day: Date) {
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
            const laid = layoutDay(dayAppts);

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
                  {/* hour lines */}
                  {hourMarks().map((m) => (
                    <div
                      key={m.hour}
                      className="pointer-events-none absolute inset-x-0 border-t border-border/60"
                      style={{ top: m.top }}
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
                  {laid.map(({ appt, top, height, lane, lanes }) => {
                    const dragging = drag?.id === appt.id;
                    const cancelled = appt.status === "cancelled";
                    const moved = Boolean(appt.originalStartsAt);
                    const widthPct = 100 / lanes;
                    return (
                      <button
                        key={appt.id}
                        type="button"
                        onPointerDown={(e) => beginDrag(e, appt, top)}
                        className={cn(
                          "absolute overflow-hidden rounded-md border border-l-4 px-1.5 py-1 text-left text-[11px] leading-tight shadow-sm transition-colors",
                          "touch-none select-none",
                          cancelled
                            ? "border-dashed border-l-muted-foreground/40 border-muted-foreground/40 bg-muted text-muted-foreground line-through"
                            : moved
                              ? "border-amber-200 border-l-amber-400 bg-amber-50 text-amber-950 hover:bg-amber-100 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100"
                              : "border-rose-200 border-l-rose-400 bg-rose-50 text-rose-950 hover:bg-rose-100 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-100",
                          dragging && "opacity-30",
                        )}
                        style={{
                          top,
                          height,
                          left: `calc(${lane * widthPct}% + 1px)`,
                          width: `calc(${widthPct}% - 2px)`,
                          zIndex: dragging ? 0 : 5,
                        }}
                      >
                        <div className="flex items-center gap-1 font-semibold">
                          {moved && !cancelled && (
                            <MoveRight
                              aria-label="Rescheduled"
                              className="size-3 shrink-0 text-amber-600"
                            />
                          )}
                          <span className="truncate">{appt.customer.name}</span>
                        </div>
                        {height > 30 && (
                          <div className="truncate opacity-80">
                            {formatTimeRange(appt.startsAt, appt.lengthMin)}
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
}: {
  drag: DragState;
  columnsEl: HTMLDivElement | null;
  days: Date[];
}) {
  if (!columnsEl) return null;
  const rect = columnsEl.getBoundingClientRect();
  const colWidth = rect.width / days.length;
  const left = rect.left + drag.dayIndex * colWidth + 2;
  const top = rect.top + drag.minutesFromOpen * PX_PER_MIN;
  const start = dateFromDayOffset(days[drag.dayIndex], drag.minutesFromOpen);

  return (
    <div
      className="pointer-events-none fixed z-50 overflow-hidden rounded-md border-2 border-primary bg-primary/30 px-1.5 py-1 text-[11px] font-semibold shadow-lg backdrop-blur-sm"
      style={{
        left,
        top,
        width: colWidth - 4,
        height: Math.max(drag.lengthMin * PX_PER_MIN, 18),
      }}
    >
      <div className="truncate">{drag.customerName}</div>
      <div className="opacity-80">
        {format(start, "EEE h:mmaaa")}
      </div>
    </div>
  );
}
