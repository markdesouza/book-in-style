import { addDays, addMinutes, set, startOfWeek } from "date-fns";
import { db } from "./index";
import { appointments, customers, newsEvents } from "./schema";

/** Seed the database with a handful of customers and a week of appointments. */
async function seed() {
  console.log("Clearing existing data…");
  await db.delete(newsEvents);
  await db.delete(appointments);
  await db.delete(customers);

  console.log("Inserting customers…");
  const inserted = await db
    .insert(customers)
    .values([
      { name: "Olivia Bennett", phone: "0412 345 678", email: "olivia@example.com", defaultLengthMin: 45, birthday: "1990-07-14", usualGap: "4 weeks" },
      { name: "Liam Carter", phone: "0423 111 222", email: "liam@example.com", defaultLengthMin: 30, birthday: "1985-03-02", usualGap: "3 weeks" },
      { name: "Sophie Nguyen", phone: "0455 987 654", email: "sophie@example.com", defaultLengthMin: 60, birthday: "1998-11-23", usualGap: "6 weeks" },
      { name: "Marcus Reed", phone: "0466 222 333", email: "marcus@example.com", defaultLengthMin: 20, birthday: "1979-06-02", usualGap: "2 weeks" },
      { name: "Ava Thompson", phone: "0477 444 555", email: "ava@example.com", defaultLengthMin: 90, birthday: "2001-01-30", usualGap: "3 months" },
      { name: "Noah Williams", phone: "0488 555 666", email: "noah@example.com", defaultLengthMin: 40, birthday: "1995-09-09", usualGap: "5 weeks" },
    ])
    .returning();

  const byName = (n: string) => inserted.find((c) => c.name.startsWith(n))!;

  const monday = startOfWeek(new Date(), { weekStartsOn: 1 });
  const at = (dayOffset: number, hour: number, minute: number) =>
    set(addDays(monday, dayOffset), { hours: hour, minutes: minute, seconds: 0, milliseconds: 0 });

  console.log("Inserting appointments…");
  const appts = await db
    .insert(appointments)
    .values([
      // Today-ish: a couple of overlapping bookings to show the lane layout.
      { customerId: byName("Olivia").id, startsAt: at(1, 9, 0), lengthMin: 45, notes: "Half head foils + trim.", status: "confirmed" as const },
      { customerId: byName("Liam").id, startsAt: at(1, 9, 20), lengthMin: 30, notes: "Skin fade.", status: "confirmed" as const },
      { customerId: byName("Sophie").id, startsAt: at(1, 10, 30), lengthMin: 60, notes: "Balayage consult." }, // unconfirmed (default)
      { customerId: byName("Marcus").id, startsAt: at(1, 14, 0), lengthMin: 20, notes: "Beard tidy.", status: "confirmed" as const },

      { customerId: byName("Ava").id, startsAt: at(2, 11, 0), lengthMin: 90, notes: "Full colour + cut." }, // unconfirmed (default)
      { customerId: byName("Noah").id, startsAt: at(2, 11, 30), lengthMin: 40, notes: "Wash and style.", status: "confirmed" as const },

      // A rescheduled (moved) appointment.
      {
        customerId: byName("Sophie").id,
        startsAt: at(3, 15, 0),
        lengthMin: 60,
        notes: "Moved from 1pm at customer request.",
        originalStartsAt: at(3, 13, 0),
        status: "confirmed" as const,
      },

      // A cancelled appointment.
      { customerId: byName("Liam").id, startsAt: at(0, 16, 0), lengthMin: 30, notes: "Couldn't make it.", status: "cancelled" as const },

      { customerId: byName("Olivia").id, startsAt: at(4, 13, 30), lengthMin: 45 },
    ])
    .returning();

  console.log("Inserting news events…");
  await db.insert(newsEvents).values([
    { appointmentId: appts[0].id, type: "new", message: "New booking: Olivia Bennett, Tue 9:00am.", seen: true },
    { appointmentId: appts[6].id, type: "moved", message: "Sophie Nguyen moved Thu appointment from 1:00pm to 3:00pm." },
    { appointmentId: appts[7].id, type: "cancelled", message: "Liam Carter cancelled Mon 4:00pm." },
    { appointmentId: appts[4].id, type: "change_requested", message: "Ava Thompson asked to add a treatment to Wed booking." },
    { appointmentId: appts[2].id, type: "new", message: "New booking: Sophie Nguyen, Tue 10:30am." },
  ]);

  console.log("Done.");
  process.exit(0);
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
