import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const dateStr = searchParams.get('date');
  if (!dateStr) return NextResponse.json({ error: "Missing date" }, { status: 400 });

  // 1. 取得該日期是星期幾
  const dayOfWeek = new Date(dateStr).getDay();

  // 2. 從資料庫抓取對應星期的時段設定
  const { data: config } = await supabase
    .from('time_slots_config')
    .select('slots')
    .eq('day_of_week', dayOfWeek)
    .single();

  const dynamicTimes = config?.slots || [];

  // 3. 抓取已預約的時段
  const { data: bookings } = await supabase
    .from('bookings')
    .select('slot_time')
    .eq('date', dateStr);

  // 4. 抓取手動關閉的時段
  const { data: closures } = await supabase
    .from('closures')
    .select('slot_time')
    .eq('date', dateStr);

  const disabledSlots = [
    ...(bookings?.map(b => b.slot_time) || []),
    ...(closures?.map(c => c.slot_time) || [])
  ];

  return NextResponse.json({
    allSlots: dynamicTimes,   // 回傳動態時段
    allDisabled: disabledSlots // 回傳不能選的時段
  });
}