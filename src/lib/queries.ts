import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { addDays } from "date-fns";
import { db } from "@/db";
import { appointments, customers, newsEvents } from "@/db/schema";
import { weekStart, type AppointmentWithCustomer } from "@/lib/salon";

/** All appointments (with customer) whose start falls within the week of `date`. */
export async function getWeekAppointments(
  date: Date,
): Promise<AppointmentWithCustomer[]> {
  const start = weekStart(date);
  const end = addDays(start, 7);

  const rows = await db
    .select()
    .from(appointments)
    .innerJoin(customers, eq(appointments.customerId, customers.id))
    .where(and(gte(appointments.startsAt, start), lt(appointments.startsAt, end)))
    .orderBy(asc(appointments.startsAt));

  return rows.map((r) => ({ ...r.appointments, customer: r.customers }));
}

export async function getCustomers() {
  return db.select().from(customers).orderBy(asc(customers.name));
}

export async function getNews(limit = 50) {
  return db
    .select()
    .from(newsEvents)
    .orderBy(desc(newsEvents.createdAt), desc(newsEvents.id))
    .limit(limit);
}

export async function getUnseenNewsCount() {
  const rows = await db
    .select({ id: newsEvents.id })
    .from(newsEvents)
    .where(eq(newsEvents.seen, false));
  return rows.length;
}
