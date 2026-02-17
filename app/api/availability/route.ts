import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date'); // 格式: 2026-02-17

  if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

  try {
    const dayOfWeek = new Date(date).getDay();

    // 1. 查詢基本時段
    const { data: configData } = await supabase
      .from('time_slots_config')
      .select('slots')
      .eq('day_of_week', dayOfWeek)
      .single();
    
    const allSlots = configData?.slots || [];

    // 2. 查詢「已被預約」的時段 (bookings)
    // 這裡使用 maybeSingle 避免報錯，並確保抓取所有符合日期的資料
    const { data: bookedData, error: bookError } = await supabase
      .from('bookings')
      .select('slot_time')
      .eq('date', date);
      
    if (bookError) console.error("Bookings Fetch Error:", bookError);

    // 3. 查詢「已被排休」的時段 (closures)
    const { data: closedData, error: closeError } = await supabase
      .from('closures')
      .select('slot_time')
      .eq('date', date);

    // 4. 資料清理 (去除空格，確保 "13:00 " 等於 "13:00")
    const normalize = (t: string) => t ? t.trim() : "";
    
    const bookedSlots = bookedData?.map((b: any) => normalize(b.slot_time)) || [];
    const closedSlots = closedData?.map((c: any) => normalize(c.slot_time)) || [];

    // 5. 合併清單：這就是前端會變成灰色的所有時段
    const allDisabled = Array.from(new Set([...bookedSlots, ...closedSlots]));

    // 回傳
    return NextResponse.json({
      allSlots: allSlots,
      allDisabled: allDisabled
    });

  } catch (error) {
    console.error("API Critical Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}