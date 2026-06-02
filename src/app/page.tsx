import { format, isValid, parseISO } from "date-fns";
import { SalonApp } from "@/components/salon-app";
import { getCustomers, getNews, getWeekAppointments } from "@/lib/queries";

export const dynamic = "force-dynamic";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date } = await searchParams;
  const parsed = date ? parseISO(date) : new Date();
  const viewDate = isValid(parsed) ? parsed : new Date();

  const [appointments, customers, news] = await Promise.all([
    getWeekAppointments(viewDate),
    getCustomers(),
    getNews(),
  ]);

  return (
    <SalonApp
      dateIso={format(viewDate, "yyyy-MM-dd")}
      appointments={appointments}
      customers={customers}
      news={news}
    />
  );
}
