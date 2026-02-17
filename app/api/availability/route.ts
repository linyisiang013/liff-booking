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
    // 1. 計算今天是星期幾 (0=週日, 1=週一...)
    const dayOfWeek = new Date(date).getDay();

    // 2. 查詢當天的「基本營業時段」 (從 time_slots_config)
    const { data: configData, error: configError } = await supabase
      .from('time_slots_config')
      .select('slots')
      .eq('day_of_week', dayOfWeek)
      .single();
    
    // 如果當天沒設定時段 (例如週日未開放)，直接回傳空
    if (configError || !configData) {
      return NextResponse.json({ allSlots: [], allDisabled: [] });
    }

    const allSlots = configData.slots || [];

    // 3. 查詢「已被預約」的時段 (從 bookings)
    const { data: bookedData } = await supabase
      .from('bookings')
      .select('slot_time')
      .eq('date', date);

    const bookedSlots = bookedData?.map((b: any) => b.slot_time) || [];

    // 4. 查詢「已被排休/關閉」的時段 (從 closures)
    const { data: closedData } = await supabase
      .from('closures')
      .select('slot_time')
      .eq('date', date);

    const closedSlots = closedData?.map((c: any) => c.slot_time) || [];

    // 5. 合併所有「不可用」的時段 (預約 + 排休)
    // 使用 Set 去除重複 (防止某個時段既被預約又被排休導致重複)
    const allDisabled = Array.from(new Set([...bookedSlots, ...closedSlots]));

    // 6. 回傳給前端
    return NextResponse.json({
      allSlots,     // 當天所有營業時段 (例如 09:40, 13:00...)
      allDisabled   // 必須鎖住的時段 (例如 13:00)
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}