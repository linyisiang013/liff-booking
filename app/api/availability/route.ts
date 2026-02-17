import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');

  if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

  try {
    const dayOfWeek = new Date(date).getDay();

    // 1. 取得設定的時段 (格式通常是 HH:MM)
    const { data: configData } = await supabase
      .from('time_slots_config')
      .select('slots')
      .eq('day_of_week', dayOfWeek)
      .single();
    
    const allSlots = configData?.slots || [];

    // 2. 取得預約與排休資料 (資料庫可能回傳 HH:MM:SS)
    const [bookedRes, closedRes] = await Promise.all([
      supabase.from('bookings').select('slot_time').eq('date', date),
      supabase.from('closures').select('slot_time').eq('date', date)
    ]);

    // *** 關鍵修正：強力正規化函數 ***
    // 能夠處理 "09:40:00" -> "09:40"
    const normalize = (t: string) => {
        if (!t) return "";
        const trimmed = t.trim(); 
        // 如果長度超過 5 (例如 09:40:00)，只取前 5 個字
        return trimmed.length > 5 ? trimmed.substring(0, 5) : trimmed;
    };

    const bookedSlots = bookedRes.data?.map((b: any) => normalize(b.slot_time)) || [];
    const closedSlots = closedRes.data?.map((c: any) => normalize(c.slot_time)) || [];

    // 合併
    const allDisabled = Array.from(new Set([...bookedSlots, ...closedSlots]));

    return NextResponse.json({
      allSlots: allSlots, // 這裡保持原始設定格式
      allDisabled: allDisabled // 這裡已經修正為無秒數格式，可以成功比對
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}