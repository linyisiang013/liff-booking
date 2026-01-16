import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const date = searchParams.get("date");
  if (!date) return NextResponse.json({ allDisabled: [], bookedDetails: [], closedOnly: [] });

  // 同時抓取預約表與關閉表
  const [bRes, cRes] = await Promise.all([
    supabase.from("bookings").select("slot_time, customer_name, customer_phone, item").eq("date", date),
    supabase.from("closures").select("slot_time").eq("date", date)
  ]);

  // 格式化函數：確保 "09:40:00" 變成 "09:40"
  const formatTime = (t: any) => t ? String(t).substring(0, 5) : "";

  // 整理預約明細
  const bookedDetails = (bRes.data || []).map(b => ({
    slot_time: formatTime(b.slot_time),
    name: b.customer_name,
    phone: b.customer_phone,
    item: b.item
  }));

  // 整理純關閉時段
  const closedOnly = (cRes.data || []).map(c => formatTime(c.slot_time));

  // 統一禁用名單 (HH:mm 格式)
  const allDisabled = [
    ...(bRes.data || []).map(b => formatTime(b.slot_time)),
    ...closedOnly
  ];

  return NextResponse.json({ 
    bookedDetails, 
    closedOnly, 
    allDisabled 
  });
}