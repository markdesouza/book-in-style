"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { format } from "date-fns";
import { db } from "@/db";
import {
  appointments,
  customers,
  newsEvents,
  type AppointmentStatus,
} from "@/db/schema";
import { MAX_LENGTH, MIN_LENGTH } from "@/lib/salon";

function clampLength(min: number) {
  const snapped = Math.round(min / 5) * 5;
  return Math.max(MIN_LENGTH, Math.min(MAX_LENGTH, snapped));
}

async function customerName(id: number) {
  const [c] = await db.select().from(customers).where(eq(customers.id, id));
  return c?.name ?? "Customer";
}

// ---------------------------------------------------------------- Customers

export async function createCustomer(input: {
  firstName: string;
  lastName?: string;
  phone?: string;
  email?: string;
  defaultLengthMin?: number;
  birthday?: string;
  usualGap?: string;
}) {
  const firstName = input.firstName.trim();
  const lastName = (input.lastName ?? "").trim();
  const name = `${firstName} ${lastName}`.trim();
  if (!name) throw new Error("Name is required");
  const [row] = await db
    .insert(customers)
    .values({
      firstName,
      lastName,
      name,
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      defaultLengthMin: clampLength(input.defaultLengthMin ?? 30),
      birthday: input.birthday || null,
      usualGap: input.usualGap || null,
    })
    .returning();
  revalidatePath("/");
  return row;
}

export async function updateCustomer(
  id: number,
  input: {
    firstName: string;
    lastName?: string;
    phone?: string;
    email?: string;
    defaultLengthMin?: number;
    birthday?: string;
    usualGap?: string;
  },
) {
  const firstName = input.firstName.trim();
  const lastName = (input.lastName ?? "").trim();
  await db
    .update(customers)
    .set({
      firstName,
      lastName,
      name: `${firstName} ${lastName}`.trim(),
      phone: input.phone?.trim() || null,
      email: input.email?.trim() || null,
      defaultLengthMin: clampLength(input.defaultLengthMin ?? 30),
      birthday: input.birthday || null,
      usualGap: input.usualGap || null,
    })
    .where(eq(customers.id, id));
  revalidatePath("/");
}

// ------------------------------------------------------------- Appointments

export async function createAppointment(input: {
  customerId: number;
  startsAt: number; // epoch ms
  lengthMin: number;
  notes?: string;
}) {
  const startsAt = new Date(input.startsAt);
  const [row] = await db
    .insert(appointments)
    .values({
      customerId: input.customerId,
      startsAt,
      lengthMin: clampLength(input.lengthMin),
      notes: input.notes?.trim() || null,
    })
    .returning();

  const name = await customerName(input.customerId);
  await db.insert(newsEvents).values({
    appointmentId: row.id,
    type: "new",
    message: `New booking: ${name}, ${format(startsAt, "EEE d MMM h:mmaaa")}.`,
  });
  revalidatePath("/");
  return row;
}

/** Update editable details of an appointment (notes, length, status, customer). */
export async function updateAppointment(
  id: number,
  input: {
    notes?: string;
    lengthMin?: number;
    status?: AppointmentStatus;
    customerId?: number;
  },
) {
  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id));
  if (!appt) throw new Error("Appointment not found");

  const set: Record<string, unknown> = { updatedAt: new Date() };
  if (input.notes !== undefined) set.notes = input.notes.trim() || null;
  if (input.lengthMin !== undefined) set.lengthMin = clampLength(input.lengthMin);
  if (input.status !== undefined) set.status = input.status;
  if (input.customerId !== undefined) set.customerId = input.customerId;
  await db.update(appointments).set(set).where(eq(appointments.id, id));

  // Post a news event when an appointment is newly cancelled.
  if (input.status === "cancelled" && appt.status !== "cancelled") {
    const name = await customerName(appt.customerId);
    await db.insert(newsEvents).values({
      appointmentId: id,
      type: "cancelled",
      message: `${name} cancelled ${format(appt.startsAt, "EEE d MMM h:mmaaa")}.`,
    });
  }
  revalidatePath("/");
}

/** Move an appointment to a new start time, flagging it as moved. */
export async function rescheduleAppointment(id: number, newStartMs: number) {
  const [appt] = await db
    .select()
    .from(appointments)
    .where(eq(appointments.id, id));
  if (!appt) throw new Error("Appointment not found");

  const newStart = new Date(newStartMs);
  if (newStart.getTime() === appt.startsAt.getTime()) return;

  await db
    .update(appointments)
    .set({
      startsAt: newStart,
      // Preserve the very first booked time so "moved" stays meaningful.
      originalStartsAt: appt.originalStartsAt ?? appt.startsAt,
      updatedAt: new Date(),
    })
    .where(eq(appointments.id, id));

  const name = await customerName(appt.customerId);
  await db.insert(newsEvents).values({
    appointmentId: id,
    type: "moved",
    message: `${name} moved to ${format(newStart, "EEE d MMM h:mmaaa")}.`,
  });
  revalidatePath("/");
}

// --------------------------------------------------------------------- News

export async function markNewsSeen(id: number) {
  await db.update(newsEvents).set({ seen: true }).where(eq(newsEvents.id, id));
  revalidatePath("/");
}

export async function markAllNewsSeen() {
  await db.update(newsEvents).set({ seen: true });
  revalidatePath("/");
}
