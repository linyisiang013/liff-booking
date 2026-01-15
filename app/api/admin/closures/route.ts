import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 新增排休 (POST)
export async function POST(req: Request) {
  try {
    const { date, slot_time } = await req.json();
    
    // 確保時間格式正確 (補上 :00)
    const dbTime = slot_time.length === 5 ? `${slot_time}:00` : slot_time;

    const { error } = await supabase
      .from("closures")
      .insert([{ date, slot_time: dbTime }]);

    if (error) throw error;
    return NextResponse.json({ message: "排休成功" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// 取消排休 (DELETE)
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const date = searchParams.get("date");
    const slot_time = searchParams.get("slot_time");

    if (!date || !slot_time) {
      return NextResponse.json({ error: "缺少日期或時間參數" }, { status: 400 });
    }

    // 確保時間格式正確 (補上 :00)
    const dbTime = slot_time.length === 5 ? `${slot_time}:00` : slot_time;

    const { error } = await supabase
      .from("closures")
      .delete()
      .eq("date", date)
      .eq("slot_time", dbTime);

    if (error) throw error;
    return NextResponse.json({ message: "已恢復開放" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}