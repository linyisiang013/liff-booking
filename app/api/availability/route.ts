import { NextResponse } from "next/server";

// 你要替換成你實際的資料來源
async function listBookingsByDate(date: string) {
  // return [{ date, slot_time:"09:40", name:"A", phone:"...", item:"..." }, ...]
  return [];
}

async function listUpcomingBookings(fromDate: string) {
  // return [{ date:"2026-01-22", slot_time:"09:40", name:"A", ... }, ...]
  return [];
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const mode = searchParams.get("mode");
  const date = searchParams.get("date");

  try {
    // 1) mode=all：回傳未來預約總覽
    if (mode === "all") {
      // 以「伺服器當地日期」為基準；若你要用台灣時間可自行固定時區策略
      const now = new Date();
      const fromDate = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
        now.getDate()
      ).padStart(2, "0")}`;

      const rows = await listUpcomingBookings(fromDate);
      return NextResponse.json({ bookedDetails: rows });
    }

    // 2) 單日查詢
    if (!date) {
      return NextResponse.json({ bookedDetails: [] }, { status: 200 });
    }

    const rows = await listBookingsByDate(date);
    return NextResponse.json({ bookedDetails: rows });
  } catch (e: any) {
    return NextResponse.json({ error: "availability api error", detail: String(e?.message ?? e) }, { status: 500 });
  }
}
