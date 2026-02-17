import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const dateStr = searchParams.get('date'); 

  if (!dateStr) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

  try {
    // 1. 確保日期抓取正確（解決時區偏移問題）
    const targetDate = new Date(dateStr);
    const dayOfWeek = targetDate.getDay();

    // 2. 抓取基本時段設定
    const { data: configData } = await supabase
      .from('time_slots_config')
      .select('slots')
      .eq('day_of_week', dayOfWeek)
      .single();
    
    const allSlots: string[] = configData?.slots || [];
    if (allSlots.length === 0) return NextResponse.json({ allSlots: [], allDisabled: [] });

    // 3. 同時抓取預約與排休
    const [bookedRes, closedRes] = await Promise.all([
      supabase.from('bookings').select('slot_time').eq('date', dateStr),
      supabase.from('closures').select('slot_time').eq('date', dateStr)
    ]);

    // 4. 強力比對邏輯：去除所有空格、統一格式
    const normalize = (t: any) => String(t || "").trim();

    const bookedList = bookedRes.data?.map(b => normalize(b.slot_time)) || [];
    const closedList = closedRes.data?.map(c => normalize(c.slot_time)) || [];

    // 合併禁選名單
    const allDisabled = Array.from(new Set([...bookedList, ...closedList]));

    // 偵錯用：如果還是不行，請在瀏覽器開 API 網址看這裡的輸出
    console.log(`查詢日期: ${dateStr}, 找到預約: ${bookedList.length} 筆, 找到排休: ${closedList.length} 筆`);

    return NextResponse.json({
      allSlots: allSlots.map(normalize),
      allDisabled: allDisabled
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}