import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 1. 處理「查詢」：讓客戶端看到哪些時段已滿
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

  try {
    // 同時抓取預約(bookings)與排休(closures)
    const [bookedRes, closedRes] = await Promise.all([
      supabase.from('bookings').select('slot_time').eq('date', date),
      supabase.from('closures').select('slot_time').eq('date', date)
    ]);

    // 清理字串，防止因為資料庫存 "09:40 " (多了空格) 導致比對失敗
    const booked = bookedRes.data?.map(b => b.slot_time.trim()) || [];
    const closed = closedRes.data?.map(c => c.slot_time.trim()) || [];

    // 合併兩者回傳給前端
    return NextResponse.json({ 
      bookedSlots: booked, 
      closedSlots: closed,
      allDisabled: Array.from(new Set([...booked, ...closed]))
    });
  } catch (error) {
    return NextResponse.json({ error: 'Fetch Error' }, { status: 500 });
  }
}

// 2. 處理「預約提交」：儲存並發送 LINE 通知
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { date, slot_time, customer_name, customer_phone, item, line_user_id } = body;

    // A. 寫入資料庫
    const { data, error } = await supabase
      .from('bookings')
      .insert([{ date, slot_time, customer_name, customer_phone, item, line_user_id }]);

    if (error) throw error;

    // B. 發送 LINE 訊息通知 (Messaging API)
    if (process.env.LINE_CHANNEL_ACCESS_TOKEN) {
      await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
        },
        body: JSON.stringify({
          messages: [{
            type: 'text',
            text: `🔔 新預約通知！\n日期：${date}\n時間：${slot_time}\n客戶：${customer_name}\n項目：${item}\n電話：${customer_phone}`
          }]
        })
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("Booking Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}