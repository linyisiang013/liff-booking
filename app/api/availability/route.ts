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

  // 整理預約明細（給管理員看）
  const bookedDetails = (bRes.data || []).map(b => ({
    slot_time: b.slot_time,
    name: b.customer_name,
    phone: b.customer_phone,
    item: b.item
  }));

  // 整理純關閉時段（給管理員看）
  const closedOnly = (cRes.data || []).map(c => String(c.slot_time));

  // 統一禁用名單：包含「已預約」與「管理員手動關閉」
  const allDisabled = [
    ...(bRes.data || []).map(b => String(b.slot_time)),
    ...closedOnly
  ];

  return NextResponse.json({ 
    bookedDetails, 
    closedOnly, 
    allDisabled 
  });
}