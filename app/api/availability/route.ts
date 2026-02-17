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

    // 1. 抓取當天營業時段 (從時段範本表)
    const { data: configData } = await supabase
      .from('time_slots_config')
      .select('slots')
      .eq('day_of_week', dayOfWeek)
      .single();
    
    const allSlots: string[] = configData?.slots || [];
    if (allSlots.length === 0) return NextResponse.json({ allSlots: [], allDisabled: [] });

    // 2. [關鍵] 抓取已被客戶預約的時段 (Bookings 表)
    // 注意：欄位名稱必須是 date 和 slot_time
    const { data: bookedData } = await supabase
      .from('bookings')
      .select('slot_time')
      .eq('date', date);

    // 3. 抓取管理者排休的時段 (Closures 表)
    const { data: closedData } = await supabase
      .from('closures')
      .select('slot_time')
      .eq('date', date);

    // 4. 整理出所有要「變灰色」的清單
    // 我們使用 trim() 來避免字串前後有多餘空格導致比對失敗
    const bookedList = bookedData?.map(b => b.slot_time.trim()) || [];
    const closedList = closedData?.map(c => c.slot_time.trim()) || [];

    // 合併兩者，形成最終禁選名單
    const allDisabled = Array.from(new Set([...bookedList, ...closedList]));

    console.log(`日期: ${date}, 預約佔用: ${bookedList}, 排休佔用: ${closedList}`);

    return NextResponse.json({
      allSlots,
      allDisabled
    });

  } catch (error) {
    console.error("API 發生錯誤:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}