import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

// 建立 Supabase 客戶端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date'); // 格式應為 YYYY-MM-DD

  if (!date) return NextResponse.json({ error: 'Date is required' }, { status: 400 });

  try {
    // 1. 計算今天是星期幾 (0=週日, 1=週一...)
    const dayOfWeek = new Date(date).getDay();

    // 2. 查詢「基本營業時段」
    const { data: configData } = await supabase
      .from('time_slots_config')
      .select('slots')
      .eq('day_of_week', dayOfWeek)
      .single();
    
    const allSlots: string[] = configData?.slots || [];

    // 若當天根本沒開，直接回傳全空
    if (allSlots.length === 0) {
      return NextResponse.json({ allSlots: [], allDisabled: [] });
    }

    // 3. 查詢「已被預約」的時段 (Bookings)
    // 這裡會因為剛剛的 SQL 設定，現在能正確抓到資料了
    const { data: bookedData, error: bookError } = await supabase
      .from('bookings')
      .select('slot_time')
      .eq('date', date);

    if (bookError) console.error("Booking Fetch Error:", bookError);

    // 4. 查詢「已被排休」的時段 (Closures)
    const { data: closedData, error: closeError } = await supabase
      .from('closures')
      .select('slot_time')
      .eq('date', date);

    if (closeError) console.error("Closure Fetch Error:", closeError);

    // 5. 資料整理與正規化 (去除多餘空白，確保精準比對)
    const normalize = (t: string) => t.trim();

    const bookedSlots = bookedData?.map((b: any) => normalize(b.slot_time)) || [];
    const closedSlots = closedData?.map((c: any) => normalize(c.slot_time)) || [];

    // 合併所有「不可用」清單
    const allDisabled = Array.from(new Set([...bookedSlots, ...closedSlots]));

    // 6. 回傳
    return NextResponse.json({
      allSlots,     // 例如: ["09:40", "13:00", "16:00", "19:20"]
      allDisabled   // 例如: ["16:00", "19:20"] (包含被預約和被排休的)
    });

  } catch (error) {
    console.error("API Error:", error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}