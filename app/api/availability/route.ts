import { NextResponse } from "next/server";

const TIMES = ["09:40", "13:00", "16:00", "19:20"];

type BookingDetail = {
  slot_time: string;
  name: string;
  phone?: string;
  item?: string;
};

/** Convert "HH:MM" to minutes for reliable sorting */
function timeToMinutes(t: string) {
  const [hh, mm] = (t || "").split(":").map((x) => Number(x));
  if (Number.isFinite(hh) && Number.isFinite(mm)) return hh * 60 + mm;
  return Number.POSITIVE_INFINITY;
}

/** Sort bookings from early to late */
function sortBookedDetails(arr: BookingDetail[]) {
  return [...arr].sort((a, b) => timeToMinutes(a.slot_time) - timeToMinutes(b.slot_time));
}

/**
 * Fetch bookings for a given date.
 *
 * Default implementation (optional):
 * - If Supabase env vars exist, it will query Supabase REST (PostgREST).
 * - Otherwise returns [].
 *
 * If you have your own DB/Sheet/Firestore logic, replace this function body.
 */
async function fetchBookedDetails(date: string): Promise<BookingDetail[]> {
  const supabaseUrl = process.env.SUPABASE_URL;
  const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;

  // Use Service Role key if available; otherwise fall back to anon key
  const supabaseKey = supabaseServiceRoleKey || supabaseAnonKey;

  // If Supabase not configured, return empty list (keeps build/runtime safe)
  if (!supabaseUrl || !supabaseKey) return [];

  // IMPORTANT:
  // Table name assumed: "bookings"
  // Columns assumed: date, slot_time, name, phone, item
  // If your table/columns differ, update select & filters below.
  const url =
    `${supabaseUrl}/rest/v1/bookings` +
    `?select=slot_time,name,phone,item` +
    `&date=eq.${encodeURIComponent(date)}`;

  const res = await fetch(url, {
    method: "GET",
    headers: {
      apikey: supabaseKey,
      Authorization: `Bearer ${supabaseKey}`,
      "Content-Type": "application/json",
    },
    // Avoid caching so admin always sees latest updates
    cache: "no-store",
  });

  if (!res.ok) {
    // Fail closed: do not throw to keep API stable for UI
    return [];
  }

  const rows = (await res.json()) as any[];

  // Normalize output to BookingDetail[]
  const bookedDetails: BookingDetail[] = rows
    .map((r) => ({
      slot_time: String(r.slot_time ?? ""),
      name: String(r.name ?? ""),
      phone: r.phone != null ? String(r.phone) : "",
      item: r.item != null ? String(r.item) : "",
    }))
    .filter((x) => x.slot_time && x.name);

  return bookedDetails;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");

  if (!date) {
    return NextResponse.json(
      {
        ok: false,
        error: "Missing required query param: date (YYYY-MM-DD)",
        bookedDetails: [],
        availability: TIMES.map((t) => ({ time: t, isBooked: false })),
      },
      { status: 400 }
    );
  }

  // 1) Fetch booked details
  const bookedDetailsRaw = await fetchBookedDetails(date);

  // 2) Sort early->late
  const bookedDetails = sortBookedDetails(bookedDetailsRaw);

  // 3) Build availability (for other pages / future usage)
  const bookedSet = new Set(bookedDetails.map((b) => b.slot_time));
  const availability = TIMES.map((t) => ({
    time: t,
    isBooked: bookedSet.has(t),
  }));

  return NextResponse.json({
    ok: true,
    date,
    bookedDetails,
    availability,
  });
}
