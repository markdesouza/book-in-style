"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { LENGTH_OPTIONS } from "@/lib/salon";
import type { Customer } from "@/db/schema";
import { updateCustomer } from "@/app/actions";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];
const DAYS = Array.from({ length: 31 }, (_, i) => i + 1);
// Max day per month; Feb allows 29 (no year, so leap-day birthdays are valid).
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
const GAP_OPTIONS = [
  "2 weeks",
  "3 weeks",
  "4 weeks",
  "5 weeks",
  "6 weeks",
  "2 months",
  "3 months",
  "4 months",
  "5 months",
  "6 months",
];

/** View / edit a customer's details. Opens when `customer` is non-null. */
export function CustomerDialog({
  customer,
  onClose,
}: {
  customer: Customer | null;
  onClose: () => void;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthDay, setBirthDay] = useState("");
  const [birthMonth, setBirthMonth] = useState("");
  const [defaultLengthMin, setDefaultLengthMin] = useState(30);
  const [usualGap, setUsualGap] = useState("");

  useEffect(() => {
    if (customer) {
      setFirstName(customer.firstName);
      setLastName(customer.lastName);
      setPhone(customer.phone ?? "");
      setEmail(customer.email ?? "");
      // Birthday is stored "YYYY-MM-DD"; only the day & month are shown.
      const [, m, d] = (customer.birthday ?? "").split("-");
      setBirthMonth(m ? String(Number(m)) : "");
      setBirthDay(d ? String(Number(d)) : "");
      setDefaultLengthMin(customer.defaultLengthMin);
      setUsualGap(customer.usualGap ?? "");
    }
  }, [customer]);

  if (!customer) return null;

  // --- validation ---
  const lastNameValid = lastName.trim() !== "";
  const phoneValid = /^(?:\+?61|0)4\d{8}$/.test(phone.replace(/[\s()-]/g, ""));
  const emailValid =
    email.trim() === "" || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
  const bothBday = birthDay !== "" && birthMonth !== "";
  const birthdayValid =
    (birthDay === "" && birthMonth === "") ||
    (bothBday && Number(birthDay) <= DAYS_IN_MONTH[Number(birthMonth) - 1]);
  const formValid =
    lastNameValid && phoneValid && emailValid && birthdayValid;

  const save = () => {
    if (!formValid) return;
    // Compose the day/month back into the stored date (year is a placeholder).
    const birthday =
      birthMonth && birthDay
        ? `2000-${birthMonth.padStart(2, "0")}-${birthDay.padStart(2, "0")}`
        : "";
    startTransition(async () => {
      await updateCustomer(customer.id, {
        firstName,
        lastName,
        phone,
        email,
        birthday,
        defaultLengthMin,
        usualGap,
      });
      toast.success("Customer updated");
      router.refresh();
      onClose();
    });
  };

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader className="-mx-4 -mt-4 rounded-t-xl border-b bg-muted/50 px-4 py-[0.8rem]">
          <DialogTitle className="font-bold">Customer details</DialogTitle>
          <DialogDescription className="sr-only">
            Edit the customer&rsquo;s details.
          </DialogDescription>
        </DialogHeader>

        <div className="-mt-2.5 space-y-4 py-1 text-sm">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cust-first" className="font-bold">
                First name
              </Label>
              <Input
                id="cust-first"
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                placeholder="Jane"
              />
            </div>
            <div className="grid gap-2">
              <div className="flex items-baseline gap-2">
                <Label
                  htmlFor="cust-last"
                  className={cn("font-bold", !lastNameValid && "text-destructive")}
                >
                  Last name
                </Label>
                {!lastNameValid && (
                  <span className="text-xs font-normal text-destructive">Required</span>
                )}
              </div>
              <Input
                id="cust-last"
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                placeholder="Smith"
              />
            </div>
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline gap-2">
              <Label
                htmlFor="cust-phone"
                className={cn("font-bold", !phoneValid && "text-destructive")}
              >
                Mobile
              </Label>
              {!phoneValid && (
                <span className="text-xs font-normal text-destructive">
                  Valid Australian mobile required
                </span>
              )}
            </div>
            <Input
              id="cust-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="0412 345 678"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline gap-2">
              <Label
                htmlFor="cust-email"
                className={cn("font-bold", !emailValid && "text-destructive")}
              >
                Email
              </Label>
              {!emailValid && (
                <span className="text-xs font-normal text-destructive">Invalid email</span>
              )}
            </div>
            <Input
              id="cust-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>

          <div className="grid gap-2">
            <div className="flex items-baseline gap-2">
              <Label className={cn("font-bold", !birthdayValid && "text-destructive")}>
                Birthday
              </Label>
              {!birthdayValid && (
                <span className="text-xs font-normal text-destructive">Invalid date</span>
              )}
            </div>
            <div className="flex gap-2">
              <Select value={birthDay} onValueChange={(v) => v && setBirthDay(v)}>
                <SelectTrigger className="w-20" aria-label="Birthday day">
                  <SelectValue placeholder="Day" />
                </SelectTrigger>
                <SelectContent>
                  {DAYS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={birthMonth}
                onValueChange={(v) => v && setBirthMonth(v)}
              >
                <SelectTrigger className="w-24" aria-label="Birthday month">
                  <SelectValue placeholder="Month">
                    {(v: string) => MONTHS[Number(v) - 1]}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  {MONTHS.map((name, i) => (
                    <SelectItem key={name} value={String(i + 1)}>
                      {name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cust-length" className="font-bold">
                Usual duration
              </Label>
              <Select
                value={String(defaultLengthMin)}
                onValueChange={(v) => v && setDefaultLengthMin(Number(v))}
              >
                <SelectTrigger id="cust-length">
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
              <Label htmlFor="cust-gap" className="font-bold">
                Usual Appointment Gap
              </Label>
              <Select value={usualGap} onValueChange={(v) => v && setUsualGap(v)}>
                <SelectTrigger id="cust-gap">
                  <SelectValue placeholder="Select gap" />
                </SelectTrigger>
                <SelectContent>
                  {GAP_OPTIONS.map((g) => (
                    <SelectItem key={g} value={g}>
                      {g}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <DialogFooter className="py-[0.8rem] sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Close
          </Button>
          <Button onClick={save} disabled={pending || !formValid}>
            Update
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
