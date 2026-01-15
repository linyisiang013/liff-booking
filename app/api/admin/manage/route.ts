import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function POST(req: Request) {
  const { type, date, slot_time } = await req.json();

  if (type === 'cancel_booking') {
    // 刪除該時段的客戶預約
    await supabase.from("bookings").delete().eq("date", date).eq("slot_time", slot_time);
  } else {
    // 切換手動公休狀態
    const { data } = await supabase.from("closures").select().eq("date", date).eq("slot_time", slot_time);
    if (data && data.length > 0) {
      await supabase.from("closures").delete().eq("date", date).eq("slot_time", slot_time);
    } else {
      await supabase.from("closures").insert({ date, slot_time });
    }
  }
  return NextResponse.json({ success: true });
}