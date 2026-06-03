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
import { LENGTH_OPTIONS } from "@/lib/salon";
import type { Customer } from "@/db/schema";
import { updateCustomer } from "@/app/actions";

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
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [birthday, setBirthday] = useState("");
  const [defaultLengthMin, setDefaultLengthMin] = useState(30);

  useEffect(() => {
    if (customer) {
      setName(customer.name);
      setPhone(customer.phone ?? "");
      setEmail(customer.email ?? "");
      setBirthday(customer.birthday ?? "");
      setDefaultLengthMin(customer.defaultLengthMin);
    }
  }, [customer]);

  if (!customer) return null;

  const save = () => {
    if (!name.trim()) {
      toast.error("Name is required");
      return;
    }
    startTransition(async () => {
      await updateCustomer(customer.id, {
        name,
        phone,
        email,
        birthday,
        defaultLengthMin,
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
            Edit the customer&rsquo;s contact details and usual appointment
            length.
          </DialogDescription>
        </DialogHeader>

        <div className="-mt-2.5 space-y-4 py-1 text-sm">
          <div className="grid gap-2">
            <Label htmlFor="cust-name" className="font-bold">
              Name
            </Label>
            <Input
              id="cust-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Jane Smith"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-2">
              <Label htmlFor="cust-phone" className="font-bold">
                Mobile
              </Label>
              <Input
                id="cust-phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="0412 345 678"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="cust-bday" className="font-bold">
                Birthday
              </Label>
              <Input
                id="cust-bday"
                type="date"
                value={birthday}
                onChange={(e) => setBirthday(e.target.value)}
              />
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cust-email" className="font-bold">
              Email
            </Label>
            <Input
              id="cust-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
            />
          </div>

          <div className="grid gap-2">
            <Label htmlFor="cust-length" className="font-bold">
              Usual duration
            </Label>
            <Select
              value={String(defaultLengthMin)}
              onValueChange={(v) => v && setDefaultLengthMin(Number(v))}
            >
              <SelectTrigger id="cust-length" className="w-32">
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

        <DialogFooter className="py-[0.8rem] sm:justify-between">
          <Button variant="outline" onClick={onClose} disabled={pending}>
            Close
          </Button>
          <Button onClick={save} disabled={pending}>
            Save
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
