"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Mail, Phone } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LENGTH_OPTIONS, type AppointmentWithCustomer } from "@/lib/salon";
import { APPOINTMENT_STATUSES, type AppointmentStatus } from "@/db/schema";
import { updateAppointment } from "@/app/actions";

/** Highlight colours for the active status button. */
const STATUS_ACTIVE: Record<AppointmentStatus, string> = {
  cancelled: "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-300",
  unconfirmed:
    "bg-amber-100 text-amber-800 dark:bg-amber-500/20 dark:text-amber-300",
  confirmed:
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-300",
};

export function AppointmentDialog({
  appointment,
  onClose,
}: {
  appointment: AppointmentWithCustomer | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [lengthMin, setLengthMin] = useState(30);
  const [status, setStatus] = useState<AppointmentStatus>("unconfirmed");

  // Reset form whenever a different appointment is opened.
  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes ?? "");
      setLengthMin(appointment.lengthMin);
      setStatus(appointment.status);
    }
  }, [appointment]);

  if (!appointment) return null;
  const c = appointment.customer;

  const save = () => {
    startTransition(async () => {
      await updateAppointment(appointment.id, { notes, lengthMin, status });
      toast.success("Appointment updated");
      router.refresh();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="-mx-4 -mt-4 rounded-t-xl border-b bg-muted/50 p-4">
          <DialogTitle className="font-bold">Appointment details</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the appointment&rsquo;s status, duration and notes.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1 text-sm">
          {/* Customer */}
          <div className="space-y-1">
            <p className="font-bold text-foreground">{c.name}</p>
            {c.phone && (
              <a
                href={`tel:${c.phone.replace(/\s+/g, "")}`}
                className="flex w-fit items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
              >
                <Phone className="size-3.5" />
                {c.phone}
              </a>
            )}
            {c.email && (
              <a
                href={`mailto:${c.email}`}
                className="flex w-fit items-center gap-1.5 text-muted-foreground hover:text-foreground hover:underline"
              >
                <Mail className="size-3.5" />
                {c.email}
              </a>
            )}
          </div>

          {appointment.originalStartsAt && (
            <p className="text-xs text-muted-foreground">
              Originally booked for{" "}
              {format(appointment.originalStartsAt, "EEE d MMM, h:mmaaa")}.
            </p>
          )}

          {/* Time */}
          <div className="flex items-center gap-2">
            <Label className="font-bold">Time:</Label>
            <span className="text-muted-foreground">
              {format(appointment.startsAt, "h:mmaaa, EEEE (d MMMM)")}
            </span>
          </div>

          {/* Duration */}
          <div className="flex items-center gap-3">
            <Label htmlFor="duration" className="font-bold">
              Duration:
            </Label>
            <Select
              value={String(lengthMin)}
              onValueChange={(v) => v && setLengthMin(Number(v))}
            >
              <SelectTrigger id="duration" className="w-32">
                <SelectValue>{(v: string) => `${v} min`}</SelectValue>
              </SelectTrigger>
              <SelectContent>
                {LENGTH_OPTIONS.map((m) => (
                  <SelectItem key={m} value={String(m)}>
                    {m} min
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes" className="font-bold">
              Notes:
            </Label>
            <Textarea
              id="notes"
              value={notes}
              placeholder="Add a note about this appointment…"
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>

          {/* Status */}
          <div className="grid gap-2">
            <Label className="font-bold">Status:</Label>
            <div
              role="group"
              aria-label="Status"
              className="inline-flex w-fit gap-1 rounded-lg border p-1"
            >
              {APPOINTMENT_STATUSES.map((s) => {
                const active = status === s.value;
                return (
                  <button
                    key={s.value}
                    type="button"
                    onClick={() => setStatus(s.value)}
                    aria-pressed={active}
                    className={cn(
                      "rounded-md px-3 py-1 text-sm font-medium transition-colors",
                      active
                        ? cn(STATUS_ACTIVE[s.value], "shadow-sm")
                        : "text-muted-foreground hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Close
          </Button>
          <Button onClick={save} disabled={pending}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
