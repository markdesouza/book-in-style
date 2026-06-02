import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

/**
 * Customers of the salon.
 * `defaultLengthMin` is the customer's usual appointment length (20-120, step 5).
 * `birthday` is stored as an ISO date string "YYYY-MM-DD" (no time component).
 */
export const customers = sqliteTable("customers", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  defaultLengthMin: integer("default_length_min").notNull().default(30),
  birthday: text("birthday"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * A booked appointment.
 * `startsAt` is the current scheduled start (epoch seconds).
 * `originalStartsAt` records the first booked time; set the first time an
 * appointment is rescheduled so the UI can flag it as "moved".
 * `status` is one of:
 *   - "unconfirmed" newly booked, not yet confirmed (the default)
 *   - "confirmed"   confirmed with the customer
 *   - "cancelled"   cancelled
 */
export const appointments = sqliteTable("appointments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  customerId: integer("customer_id")
    .notNull()
    .references(() => customers.id, { onDelete: "cascade" }),
  startsAt: integer("starts_at", { mode: "timestamp" }).notNull(),
  lengthMin: integer("length_min").notNull().default(30),
  notes: text("notes"),
  status: text("status", { enum: ["unconfirmed", "confirmed", "cancelled"] })
    .notNull()
    .default("unconfirmed"),
  originalStartsAt: integer("original_starts_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
  updatedAt: integer("updated_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

/**
 * News feed events. Each meaningful change to an appointment produces one.
 * `type`:
 *   - "new"             a new appointment was created
 *   - "change_requested" a customer requested a change (notes/length)
 *   - "moved"           an appointment was rescheduled
 *   - "cancelled"       an appointment was cancelled
 * `seen` flips to true once acknowledged in the feed.
 */
export const newsEvents = sqliteTable("news_events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  appointmentId: integer("appointment_id").references(() => appointments.id, {
    onDelete: "cascade",
  }),
  type: text("type", {
    enum: ["new", "change_requested", "moved", "cancelled"],
  }).notNull(),
  message: text("message").notNull(),
  seen: integer("seen", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .default(sql`(unixepoch())`),
});

export type AppointmentStatus = "unconfirmed" | "confirmed" | "cancelled";

/** Status options in display order, for radio groups / filters. */
export const APPOINTMENT_STATUSES: { value: AppointmentStatus; label: string }[] =
  [
    { value: "cancelled", label: "Cancelled" },
    { value: "unconfirmed", label: "Unconfirmed" },
    { value: "confirmed", label: "Confirmed" },
  ];

export type Customer = typeof customers.$inferSelect;
export type NewCustomer = typeof customers.$inferInsert;
export type Appointment = typeof appointments.$inferSelect;
export type NewAppointment = typeof appointments.$inferInsert;
export type NewsEvent = typeof newsEvents.$inferSelect;
