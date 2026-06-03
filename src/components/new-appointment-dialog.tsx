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
  const [birthday, setBirthday] = useState("");

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
      setBirthday("");
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
          if (!firstName.trim() && !lastName.trim()) {
            toast.error("Customer name is required");
            return;
          }
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
                  <Label htmlFor="c-last">Last name</Label>
                  <Input
                    id="c-last"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Smith"
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="c-phone">Phone</Label>
                  <Input
                    id="c-phone"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="0412 345 678"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="c-bday">Birthday</Label>
                  <Input
                    id="c-bday"
                    type="date"
                    value={birthday}
                    onChange={(e) => setBirthday(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="c-email">Email</Label>
                <Input
                  id="c-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                />
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
          <Button onClick={submit} disabled={pending}>
            Create
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
