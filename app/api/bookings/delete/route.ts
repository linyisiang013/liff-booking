import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { date, slot_time } = await req.json();
    if (!date || !slot_time) return NextResponse.json({ error: "缺失日期或時段" }, { status: 400 });

    const { error } = await supabase
      .from("bookings")
      .delete()
      .eq("date", date)
      .eq("slot_time", slot_time.includes(":") && slot_time.length === 5 ? `${slot_time}:00` : slot_time);

    if (error) throw error;
    return NextResponse.json({ message: "取消成功" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}