import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { date, slot_time, type } = await req.json(); // type 可為 'booking' 或 'closure'
    if (!date || !slot_time) return NextResponse.json({ error: "缺失資料" }, { status: 400 });

    const table = type === 'closure' ? 'closures' : 'bookings';
    
    const { error } = await supabase
      .from(table)
      .delete()
      .eq("date", date)
      .eq("slot_time", slot_time.length === 5 ? `${slot_time}:00` : slot_time);

    if (error) throw error;
    return NextResponse.json({ message: "刪除成功" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}