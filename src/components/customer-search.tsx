"use client";

import { useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import type { Customer } from "@/db/schema";

/**
 * Header autocomplete: type a name, pick a customer, and the parent opens
 * that customer's details. Mirrors the reassign autocomplete used in the
 * appointment dialog.
 */
export function CustomerSearch({
  customers,
  onSelect,
}: {
  customers: Customer[];
  onSelect: (customer: Customer) => void;
}) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);

  const query = search.trim().toLowerCase();
  const matches =
    query === ""
      ? []
      : customers
          .filter((c) => c.name.toLowerCase().includes(query))
          .slice(0, 8);

  const pick = (customer: Customer) => {
    onSelect(customer);
    setSearch("");
    setOpen(false);
  };

  return (
    <div className="relative">
      <Search className="pointer-events-none absolute top-1/2 left-2 size-4 -translate-y-1/2 text-muted-foreground" />
      <Input
        placeholder="Search customer…"
        value={search}
        onChange={(e) => {
          setSearch(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="h-9 w-44 pl-8"
        aria-label="Search customer"
      />
      {open && matches.length > 0 && (
        <ul className="absolute z-50 mt-1 max-h-60 w-full min-w-52 overflow-auto rounded-md border bg-popover py-1 shadow-md ring-1 ring-foreground/10">
          {matches.map((customer) => (
            <li key={customer.id}>
              <button
                type="button"
                // Keep the input focused so onBlur doesn't pre-empt this click.
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => pick(customer)}
                className="w-full px-2 py-1.5 text-left text-sm hover:bg-accent"
              >
                {customer.name}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
