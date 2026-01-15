import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    // 對接前端傳出的欄位名稱
    const { line_user_id, customer_name, customer_phone, date, slot_time, item } = await req.json();

    const { error: insertError } = await supabase
      .from("bookings")
      .insert([
        { 
          customer_name: String(customer_name || "未填"),
          customer_phone: String(customer_phone || ""),
          date: String(date),
          slot_time: String(slot_time), // 傳入 "09:40"，DB 會自動存成 "09:40:00"
          item: String(item || ""),
          status: "confirmed",
          line_user_id: String(line_user_id || "FROM_WEB_BOOKING") 
        }
      ]);

    if (insertError) {
      console.error("SQL Error:", insertError);
      return NextResponse.json({ error: `資料庫錯誤: ${insertError.message}` }, { status: 500 });
    }

    return NextResponse.json({ message: "預約成功" }, { status: 200 });

  } catch (err: any) {
    return NextResponse.json({ error: `系統錯誤: ${err.message}` }, { status: 500 });
  }
}