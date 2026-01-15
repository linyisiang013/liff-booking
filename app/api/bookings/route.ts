import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { name, phone, date, slot_time, item } = await req.json();

    const { error: insertError } = await supabase
      .from("bookings")
      .insert([
        { 
          customer_name: String(name),
          customer_phone: String(phone || ""),
          date: String(date),
          slot_time: String(slot_time),
          item: String(item || ""),
          status: "confirmed",
          // 修正點：填入 line_user_id 避免資料庫報錯
          line_user_id: "FROM_WEB_BOOKING" 
        }
      ]);

    if (insertError) {
      console.error("SQL Error:", insertError);
      return NextResponse.json({ message: `資料庫錯誤: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "預約成功" }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ message: `系統錯誤: ${err.message}` }, { status: 500 });
  }
}