"use client";

import { useCallback, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  addDays,
  format,
  isSameDay,
  parseISO,
} from "date-fns";
import {
  CalendarPlus,
  ChevronLeft,
  ChevronRight,
  Eye,
  EyeOff,
  Scissors,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMediaQuery } from "@/lib/use-media-query";
import { weekDays, type AppointmentWithCustomer } from "@/lib/salon";
import type { Customer, NewsEvent } from "@/db/schema";
import { CalendarGrid } from "@/components/calendar-grid";
import { AppointmentDialog } from "@/components/appointment-dialog";
import { NewAppointmentDialog } from "@/components/new-appointment-dialog";
import { NewsFeed } from "@/components/news-feed";

interface Props {
  dateIso: string;
  appointments: AppointmentWithCustomer[];
  customers: Customer[];
  news: NewsEvent[];
}

export function SalonApp({ dateIso, appointments, customers, news }: Props) {
  const router = useRouter();
  const viewDate = useMemo(() => parseISO(dateIso), [dateIso]);
  const isMobile = useMediaQuery("(max-width: 767px)");

  const [showCancelled, setShowCancelled] = useState(false);
  const [editing, setEditing] = useState<AppointmentWithCustomer | null>(null);
  const [creating, setCreating] = useState<{ day: Date; start: Date } | null>(
    null,
  );
  const [newsOpen, setNewsOpen] = useState(false);

  const days = useMemo(
    () => (isMobile ? [viewDate] : weekDays(viewDate)),
    [isMobile, viewDate],
  );

  const navigate = useCallback(
    (deltaDays: number) => {
      router.push(`/?date=${format(addDays(viewDate, deltaDays), "yyyy-MM-dd")}`);
    },
    [router, viewDate],
  );

  const goToday = useCallback(() => {
    router.push(`/?date=${format(new Date(), "yyyy-MM-dd")}`);
  }, [router]);

  const step = isMobile ? 1 : 7;

  const rangeLabel = isMobile
    ? format(viewDate, "EEEE d MMMM")
    : `${format(days[0], "d MMM")} – ${format(days[6], "d MMM yyyy")}`;

  const unseen = news.filter((n) => !n.seen).length;

  const todayInView = days.some((d) => isSameDay(d, new Date()));

  return (
    <div className="flex h-dvh flex-col bg-background">
      <header className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b px-4 py-3">
        <div className="flex items-center gap-2 font-semibold">
          <Scissors className="size-5 text-primary" />
          <span className="hidden sm:inline">Book in Style</span>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-step)}
            aria-label="Previous"
          >
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(step)}
            aria-label="Next"
          >
            <ChevronRight className="size-4" />
          </Button>
        </div>

        <div className="min-w-0 flex-1 truncate text-sm font-medium text-muted-foreground">
          {rangeLabel}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant={showCancelled ? "secondary" : "outline"}
            size="icon"
            onClick={() => setShowCancelled((v) => !v)}
            title={
              showCancelled
                ? "Hide cancelled appointments"
                : "Show cancelled appointments"
            }
            aria-pressed={showCancelled}
            aria-label={
              showCancelled
                ? "Hide cancelled appointments"
                : "Show cancelled appointments"
            }
          >
            {showCancelled ? (
              <Eye className="size-4" />
            ) : (
              <EyeOff className="size-4" />
            )}
          </Button>

          <NewsFeed
            news={news}
            open={newsOpen}
            onOpenChange={setNewsOpen}
            unseen={unseen}
          />

          <Button
            size="sm"
            onClick={() =>
              setCreating({ day: days[0], start: defaultStart(days[0]) })
            }
          >
            <CalendarPlus className="size-4" />
            <span className="hidden sm:inline">New</span>
          </Button>
        </div>
      </header>

      <CalendarGrid
        days={days}
        appointments={appointments}
        showCancelled={showCancelled}
        showNow={todayInView}
        onApptClick={setEditing}
        onCreateAt={(day, start) => setCreating({ day, start })}
      />

      <AppointmentDialog
        appointment={editing}
        onClose={() => setEditing(null)}
      />

      <NewAppointmentDialog
        open={creating !== null}
        defaultStart={creating?.start ?? null}
        customers={customers}
        onClose={() => setCreating(null)}
      />
    </div>
  );
}

/** Sensible default start time when opening the New dialog from the header. */
function defaultStart(day: Date): Date {
  const d = new Date(day);
  d.setHours(10, 0, 0, 0);
  return d;
}
