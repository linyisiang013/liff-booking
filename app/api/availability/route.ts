import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 建立 Supabase 客戶端 (使用公開金鑰，現在有權限讀取了)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// 為了防止時段比對錯誤 (例如 "13:00 " 和 "13:00")，我們寫一個小工具來清理字串
const cleanTime = (t: string) => t ? t.trim() : "";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date'); // 格式: 2026-02-17

  if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

  try {
    // 1. 查今天是星期幾 (0=週日, 1=週一...)
    const dayOfWeek = new Date(date).getDay();

    // 2. 查基本營業時段 (從 time_slots_config)
    const { data: configData } = await supabase
      .from('time_slots_config')
      .select('slots')
      .eq('day_of_week', dayOfWeek)
      .single();
    
    // 如果當天沒開，直接回傳空
    const allSlots = configData?.slots || [];
    if (allSlots.length === 0) {
      return NextResponse.json({ allSlots: [], allDisabled: [] });
    }

    // 3. 查「已被客戶預約」的時段 (Bookings)
    // 因為剛剛執行了 SQL，這裡現在能抓到資料了！
    const { data: bookedData } = await supabase
      .from('bookings')
      .select('slot_time')
      .eq('date', date);

    // 4. 查「已被管理員排休」的時段 (Closures)
    const { data: closedData } = await supabase
      .from('closures')
      .select('slot_time')
      .eq('date', date);

    // 5. 資料整理：將預約和排休的時段取出，並清理空白
    const bookedSlots = bookedData?.map((b: any) => cleanTime(b.slot_time)) || [];
    const closedSlots = closedData?.map((c: any) => cleanTime(c.slot_time)) || [];

    // 6. 合併這兩份名單 -> 這就是所有「不能選」的時段
    // 使用 Set 來去除重複 (防止既被預約又被排休的情況)
    const allDisabled = Array.from(new Set([...bookedSlots, ...closedSlots]));

    // 7. 回傳給前端
    return NextResponse.json({
      allSlots,     // 所有營業時段
      allDisabled   // 必須變灰色的時段
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}