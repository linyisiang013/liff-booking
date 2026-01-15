import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { date, slot_time } = await req.json();
    
    // 寫入 closures 資料表
    const { error } = await supabase
      .from("closures")
      .insert([{ 
        date, 
        slot_time: slot_time.length === 5 ? `${slot_time}:00` : slot_time 
      }]);

    if (error) throw error;
    return NextResponse.json({ message: "成功關閉時段" });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}