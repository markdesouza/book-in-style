"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { Check, Mail, Phone, X } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerDialog } from "@/components/customer-dialog";
import { cn } from "@/lib/utils";
import { LENGTH_OPTIONS, type AppointmentWithCustomer } from "@/lib/salon";
import {
  APPOINTMENT_STATUSES,
  type AppointmentStatus,
  type Customer,
} from "@/db/schema";
import { rescheduleAppointment, updateAppointment } from "@/app/actions";

/**
 * Highlight background for the active status button (text stays black).
 * Matches the calendar's status card colours: grey / yellow / green.
 */
const STATUS_ACTIVE: Record<AppointmentStatus, string> = {
  cancelled: "bg-gray-200 dark:bg-gray-700",
  unconfirmed: "bg-yellow-100 dark:bg-yellow-500/20",
  confirmed: "bg-green-100 dark:bg-green-500/20",
};

const smallBtn = "h-7 px-2 text-xs";
const contactLink =
  "flex w-fit items-center gap-1.5 text-muted-foreground outline-none hover:text-foreground hover:underline";

export function AppointmentDialog({
  appointment,
  customers,
  onClose,
}: {
  appointment: AppointmentWithCustomer | null;
  customers: Customer[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [notes, setNotes] = useState("");
  const [lengthMin, setLengthMin] = useState(30);
  const [status, setStatus] = useState<AppointmentStatus>("unconfirmed");
  const [customerId, setCustomerId] = useState(0);
  const [changing, setChanging] = useState(false);
  const [customerSearch, setCustomerSearch] = useState("");
  const [draftCustomerId, setDraftCustomerId] = useState<number | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [startStr, setStartStr] = useState("");
  const [viewOpen, setViewOpen] = useState(false);

  // Reset form whenever a different appointment is opened.
  useEffect(() => {
    if (appointment) {
      setNotes(appointment.notes ?? "");
      setLengthMin(appointment.lengthMin);
      setStatus(appointment.status);
      setCustomerId(appointment.customerId);
      setChanging(false);
      setCustomerSearch("");
      setDraftCustomerId(null);
      setSearchOpen(false);
      setRescheduling(false);
      setStartStr(format(appointment.startsAt, "yyyy-MM-dd'T'HH:mm"));
      setViewOpen(false);
    }
  }, [appointment]);

  if (!appointment) return null;
  const customer =
    customers.find((x) => x.id === customerId) ?? appointment.customer;

  const filteredCustomers = customers.filter((x) =>
    x.name.toLowerCase().includes(customerSearch.trim().toLowerCase()),
  );
  // The customer currently selected in the autocomplete (staged, not committed).
  const previewCustomer =
    draftCustomerId != null
      ? customers.find((x) => x.id === draftCustomerId)
      : undefined;

  const startChange = () => {
    setChanging(true);
    setCustomerSearch("");
    setDraftCustomerId(null);
    setSearchOpen(true);
  };
  // Tick: stage the chosen customer (persisted only on Update).
  const confirmChange = () => {
    if (draftCustomerId != null) setCustomerId(draftCustomerId);
    setChanging(false);
  };
  // Cross: discard and keep the previous customer.
  const cancelChange = () => setChanging(false);

  const save = () => {
    const newStartMs = new Date(startStr).getTime();
    if (rescheduling && Number.isNaN(newStartMs)) {
      toast.error("Pick a valid date and time");
      return;
    }
    startTransition(async () => {
      if (rescheduling && newStartMs !== appointment.startsAt.getTime()) {
        await rescheduleAppointment(appointment.id, newStartMs);
      }
      await updateAppointment(appointment.id, {
        notes,
        lengthMin,
        status,
        customerId,
      });
      toast.success("Appointment updated");
      router.refresh();
      onClose();
    });
  };

  return (
    <>
      <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="-mx-4 -mt-4 rounded-t-xl border-b bg-muted/50 px-4 py-[0.8rem]">
          <DialogTitle className="font-bold">Appointment details</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the appointment&rsquo;s status, duration, time and customer.
          </DialogDescription>
        </DialogHeader>

        <div className="-mt-2.5 space-y-4 py-1 text-sm">
          {/* Customer */}
          <div className="space-y-1">
            {changing ? (
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Input
                    autoFocus
                    placeholder="Search customer…"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setDraftCustomerId(null);
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  />
                  {searchOpen && filteredCustomers.length > 0 && (
                    <ul className="absolute z-50 mt-1 max-h-44 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md ring-1 ring-foreground/10">
                      {filteredCustomers.map((x) => (
                        <li key={x.id}>
                          <button
                            type="button"
                            // Keep the input focused so onBlur doesn't pre-empt this click.
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setDraftCustomerId(x.id);
                              setCustomerSearch(x.name);
                              setSearchOpen(false);
                            }}
                            className={cn(
                              "w-full px-2 py-1.5 text-left text-sm hover:bg-accent",
                              draftCustomerId === x.id && "bg-accent",
                            )}
                          >
                            {x.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7 shrink-0 text-green-600"
                  aria-label="Confirm customer change"
                  onClick={confirmChange}
                  disabled={draftCustomerId == null}
                >
                  <Check className="size-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  className="size-7 shrink-0 text-rose-600"
                  aria-label="Cancel customer change"
                  onClick={cancelChange}
                >
                  <X className="size-4" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-2">
                <p className="truncate font-bold text-foreground">
                  {customer.name}
                </p>
                <div className="flex shrink-0 gap-1">
                  <Button
                    variant="outline"
                    className={smallBtn}
                    onClick={() => setViewOpen(true)}
                  >
                    View
                  </Button>
                  <Button
                    variant="outline"
                    className={smallBtn}
                    onClick={startChange}
                  >
                    Change
                  </Button>
                </div>
              </div>
            )}

            {/* While changing, keep the icons; show the selected customer's
                details, or masked placeholders until one is chosen. */}
            {changing ? (
              <>
                <div className="flex w-fit items-center gap-1.5 text-muted-foreground">
                  <Phone className="size-3.5" />
                  {previewCustomer?.phone || "---- --- ---"}
                </div>
                <div className="flex w-fit items-center gap-1.5 text-muted-foreground">
                  <Mail className="size-3.5" />
                  {previewCustomer?.email || "-------@-------.com"}
                </div>
              </>
            ) : (
              <>
                {customer.phone && (
                  <a
                    href={`tel:${customer.phone.replace(/\s+/g, "")}`}
                    className={contactLink}
                  >
                    <Phone className="size-3.5" />
                    {customer.phone}
                  </a>
                )}
                {customer.email && (
                  <a href={`mailto:${customer.email}`} className={contactLink}>
                    <Mail className="size-3.5" />
                    {customer.email}
                  </a>
                )}
              </>
            )}
          </div>

          {appointment.originalStartsAt && (
            <p className="text-xs text-muted-foreground">
              Originally booked for{" "}
              {format(appointment.originalStartsAt, "EEE d MMM, h:mmaaa")}.
            </p>
          )}

          {/* Time */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <Label className="font-bold">Time:</Label>
                <span className="truncate text-muted-foreground">
                  {format(appointment.startsAt, "h:mmaaa, EEEE (d MMMM)")}
                </span>
              </div>
              <Button
                variant="outline"
                className={cn(smallBtn, "shrink-0")}
                onClick={() => setRescheduling((v) => !v)}
                aria-pressed={rescheduling}
              >
                Reschedule
              </Button>
            </div>
            {rescheduling && (
              <Input
                type="datetime-local"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
                className="w-full"
              />
            )}
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
              className="inline-flex w-fit divide-x divide-border overflow-hidden rounded-lg border"
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
                      "px-3 py-1.5 text-sm transition-colors",
                      active
                        ? cn(
                            STATUS_ACTIVE[s.value],
                            "font-bold text-gray-700 dark:text-gray-200",
                          )
                        : "font-medium text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {s.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="py-[0.8rem] sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Close
          </Button>
          <Button onClick={save} disabled={pending || changing}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
      </Dialog>

      <CustomerDialog
        customer={viewOpen ? customer : null}
        onClose={() => setViewOpen(false)}
      />
    </>
  );
}
