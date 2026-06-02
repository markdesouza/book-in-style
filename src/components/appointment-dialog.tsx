"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { CalendarClock, Mail, Phone } from "lucide-react";
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
import { updateAppointment } from "@/app/actions";

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
                <a
                  href={`tel:${c.phone.replace(/\s+/g, "")}`}
                  className="flex items-center gap-1 hover:text-foreground hover:underline"
                >
                  <Phone className="size-3.5" />
                  {c.phone}
                </a>
              )}
              {c.email && (
                <a
                  href={`mailto:${c.email}`}
                  className="flex items-center gap-1 hover:text-foreground hover:underline"
                >
                  <Mail className="size-3.5" />
                  {c.email}
                </a>
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
