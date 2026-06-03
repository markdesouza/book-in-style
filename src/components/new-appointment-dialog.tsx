"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { format } from "date-fns";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
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
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { LENGTH_OPTIONS } from "@/lib/salon";
import type { Customer } from "@/db/schema";
import { createAppointment, createCustomer } from "@/app/actions";

const MONTHS = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function NewAppointmentDialog({
  open,
  defaultStart,
  customers,
  onClose,
}: {
  open: boolean;
  defaultStart: Date | null;
  customers: Customer[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [tab, setTab] = useState("existing");

  const [startStr, setStartStr] = useState("");
  const [lengthMin, setLengthMin] = useState(30);
  const [notes, setNotes] = useState("");
  const [customerId, setCustomerId] = useState<string>("");
  const [customerSearch, setCustomerSearch] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  // New-customer fields
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [touched, setTouched] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (open && defaultStart) {
      setStartStr(format(defaultStart, "yyyy-MM-dd'T'HH:mm"));
      setTab(customers.length ? "existing" : "new");
      setCustomerId("");
      setCustomerSearch("");
      setSearchOpen(false);
      setNotes("");
      setFirstName("");
      setLastName("");
      setPhone("");
      setEmail("");
      setBirthDay("");
      setBirthMonth("");
      setTouched({});
      setLengthMin(30);
    }
  }, [open, defaultStart, customers.length]);

  const filteredCustomers = customers.filter((x) =>
    x.name.toLowerCase().includes(customerSearch.trim().toLowerCase()),
  );
  const pickCustomer = (c: Customer) => {
    setCustomerId(String(c.id));
    setCustomerSearch(c.name);
    setLengthMin(c.defaultLengthMin); // default the duration to the usual one
    setSearchOpen(false);
  };

  // New-customer validation (mirrors the customer details dialog).
  const lastNameValid = lastName.trim() !== "";
  const phoneValid = /^(?:\+?61|0)4\d{8}$/.test(phone.replace(/[\s()-]/g, ""));
  const emailValid =
    email.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const birthdayValid =
    (birthDay === "" && birthMonth === "") ||
    (birthDay !== "" &&
      birthMonth !== "" &&
      Number(birthDay) <= DAYS_IN_MONTH[Number(birthMonth) - 1]);
  const newCustomerValid =
    lastNameValid && phoneValid && emailValid && birthdayValid;
  const markTouched = (f: string) => setTouched((t) => ({ ...t, [f]: true }));

  const submit = () => {
    const startsAt = new Date(startStr).getTime();
    if (!startStr || Number.isNaN(startsAt)) {
      toast.error("Pick a date and time");
      return;
    }

    startTransition(async () => {
      try {
        let cid: number;
        if (tab === "new") {
          if (!newCustomerValid) {
            setTouched({ last: true, phone: true, email: true, bday: true });
            return;
          }
          const birthday =
            birthDay && birthMonth
              ? `2000-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
              : "";
          const created = await createCustomer({
            firstName,
            lastName,
            phone,
            email,
            birthday,
            defaultLengthMin: lengthMin,
          });
          cid = created.id;
        } else {
          if (!customerId) {
            toast.error("Choose a customer");
            return;
          }
          cid = Number(customerId);
        }

        await createAppointment({
          customerId: cid,
          startsAt,
          lengthMin,
          notes,
        });
        toast.success("Appointment booked");
        router.refresh();
        onClose();
      } catch (err) {
        toast.error(err instanceof Error ? err.message : "Something went wrong");
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New appointment</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="existing" disabled={!customers.length}>
                Existing customer
              </TabsTrigger>
              <TabsTrigger value="new">New customer</TabsTrigger>
            </TabsList>

            <TabsContent value="existing" className="pt-1">
              <div className="grid gap-2">
                <Label htmlFor="cust-search">Customer</Label>
                <div className="relative">
                  <Input
                    id="cust-search"
                    placeholder="Search customer…"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setCustomerId("");
                      setSearchOpen(true);
                    }}
                    onFocus={() => setSearchOpen(true)}
                    onBlur={() => setTimeout(() => setSearchOpen(false), 150)}
                  />
                  {searchOpen && filteredCustomers.length > 0 && (
                    <ul className="absolute z-50 mt-1 max-h-44 w-full overflow-auto rounded-md border bg-popover py-1 shadow-md ring-1 ring-foreground/10">
                      {filteredCustomers.map((c) => (
                        <li key={c.id}>
                          <button
                            type="button"
                            // Keep focus so onBlur doesn't pre-empt the click.
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => pickCustomer(c)}
                            className={cn(
                              "w-full px-2 py-1.5 text-left text-sm hover:bg-accent",
                              String(c.id) === customerId && "bg-accent",
                            )}
                          >
                            {c.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="new" className="space-y-3 pt-1">
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="c-first">First name</Label>
                  <Input
                    id="c-first"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="Jane"
                  />
                </div>
                <div className="grid gap-2">
                  <div className="flex items-baseline gap-2">
                    <Label
                      htmlFor="c-last"
                      className={cn(
                        touched.last && !lastNameValid && "text-destructive",
                      )}
                    >
                      Last name
                    </Label>
                    {touched.last && !lastNameValid && (
                      <span className="text-xs text-destructive">Required</span>
                    )}
                  </div>
                  <Input
                    id="c-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    onBlur={() => markTouched("last")}
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <div className="flex items-baseline gap-2">
                  <Label
                    htmlFor="c-phone"
                    className={cn(
                      touched.phone && !phoneValid && "text-destructive",
                    )}
                  >
                    Mobile
                  </Label>
                  {touched.phone && !phoneValid && (
                    <span className="text-xs text-destructive">
                      Valid Australian mobile required
                    </span>
                  )}
                </div>
                <Input
                  id="c-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  onBlur={() => markTouched("phone")}
                  placeholder="0412 345 678"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-baseline gap-2">
                  <Label
                    htmlFor="c-email"
                    className={cn(
                      touched.email && !emailValid && "text-destructive",
                    )}
                  >
                    Email
                  </Label>
                  {touched.email && !emailValid && (
                    <span className="text-xs text-destructive">
                      Invalid email
                    </span>
                  )}
                </div>
                <Input
                  id="c-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => markTouched("email")}
                  placeholder="jane@example.com"
                />
              </div>

              <div className="grid gap-2">
                <div className="flex items-baseline gap-2">
                  <Label
                    className={cn(
                      touched.bday && !birthdayValid && "text-destructive",
                    )}
                  >
                    Birthday
                  </Label>
                  {touched.bday && !birthdayValid && (
                    <span className="text-xs text-destructive">
                      Invalid date
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <Select
                    value={birthDay}
                    onValueChange={(v) => {
                      if (v) setBirthDay(v === "-" ? "" : v);
                      markTouched("bday");
                    }}
                  >
                    <SelectTrigger className="w-20" aria-label="Birthday day">
                      <SelectValue placeholder="Day" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      {DAYS.map((d) => (
                        <SelectItem key={d} value={String(d)}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={birthMonth}
                    onValueChange={(v) => {
                      if (v) setBirthMonth(v === "-" ? "" : v);
                      markTouched("bday");
                    }}
                  >
                    <SelectTrigger className="w-24" aria-label="Birthday month">
                      <SelectValue placeholder="Month">
                        {(v: string) =>
                          v ? (
                            MONTHS[Number(v) - 1]
                          ) : (
                            <span className="text-muted-foreground">Month</span>
                          )
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="-">-</SelectItem>
                      {MONTHS.map((name, i) => (
                        <SelectItem key={name} value={String(i + 1)}>
                          {name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="a-start">Date &amp; time</Label>
              <Input
                id="a-start"
                type="datetime-local"
                value={startStr}
                onChange={(e) => setStartStr(e.target.value)}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="a-length">Duration</Label>
              <Select
                value={String(lengthMin)}
                onValueChange={(v) => setLengthMin(Number(v))}
              >
                <SelectTrigger id="a-length">
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
          </div>

          <div className="grid gap-2">
            <Label htmlFor="a-notes">Notes</Label>
            <Textarea
              id="a-notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={2}
              placeholder="Optional notes…"
            />
          </div>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button variant="ghost" onClick={onClose} disabled={pending}>
            Cancel
          </Button>
          <Button
            onClick={submit}
            disabled={pending || (tab === "new" && !newCustomerValid)}
          >
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
