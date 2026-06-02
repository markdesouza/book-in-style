"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarClock, Mail, Phone, RotateCcw, Trash2 } from "lucide-react";
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
import { Badge } from "@/components/ui/badge";
import { LENGTH_OPTIONS, type AppointmentWithCustomer } from "@/lib/salon";
import {
  setAppointmentStatus,
  updateAppointment,
} from "@/app/actions";

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

  // Reset form whenever a different appointment is opened.
  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes ?? "");
      setLengthMin(appointment.lengthMin);
    }
  }, [appointment]);

  if (!appointment) return null;
  const cancelled = appointment.status === "cancelled";
  const c = appointment.customer;

  const save = () => {
    startTransition(async () => {
      await updateAppointment(appointment.id, { notes, lengthMin });
      toast.success("Appointment updated");
      router.refresh();
      onClose();
    });
  };

  const toggleCancel = () => {
    startTransition(async () => {
      await setAppointmentStatus(
        appointment.id,
        cancelled ? "booked" : "cancelled",
      );
      toast.success(cancelled ? "Appointment restored" : "Appointment cancelled");
      router.refresh();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {c.name}
            {cancelled && <Badge variant="secondary">Cancelled</Badge>}
            {appointment.originalStartsAt && !cancelled && (
              <Badge
                variant="outline"
                className="border-amber-400 text-amber-600"
              >
                Moved
              </Badge>
            )}
          </DialogTitle>
          <DialogDescription className="flex items-center gap-1.5">
            <CalendarClock className="size-3.5" />
            {format(appointment.startsAt, "EEEE d MMM, h:mmaaa")}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-1 text-sm">
          {(c.phone || c.email) && (
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-muted-foreground">
              {c.phone && (
                <span className="flex items-center gap-1">
                  <Phone className="size-3.5" />
                  {c.phone}
                </span>
              )}
              {c.email && (
                <span className="flex items-center gap-1">
                  <Mail className="size-3.5" />
                  {c.email}
                </span>
              )}
            </div>
          )}

          {appointment.originalStartsAt && (
            <p className="text-xs text-muted-foreground">
              Originally booked for{" "}
              {format(appointment.originalStartsAt, "EEE d MMM, h:mmaaa")}.
            </p>
          )}

          <div className="grid gap-2">
            <Label htmlFor="length">Length</Label>
            <Select
              value={String(lengthMin)}
              onValueChange={(v) => setLengthMin(Number(v))}
            >
              <SelectTrigger id="length">
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

          <div className="grid gap-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              placeholder="Add a note about this appointment…"
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-between">
          <Button
            variant={cancelled ? "outline" : "ghost"}
            onClick={toggleCancel}
            disabled={pending}
            className={
              cancelled ? "" : "text-destructive hover:text-destructive"
            }
          >
            {cancelled ? (
              <>
                <RotateCcw className="size-4" />
                Undo cancel
              </>
            ) : (
              <>
                <Trash2 className="size-4" />
                Cancel appointment
              </>
            )}
          </Button>
          <Button onClick={save} disabled={pending}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
