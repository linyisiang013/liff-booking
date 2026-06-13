import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { line_user_id, customer_name, customer_phone, item, date, slot_time } = body;

    // 基本防呆：確保日期與時間都有填寫
    if (!date || !slot_time) {
      return NextResponse.json({ error: '日期與時間為必填' }, { status: 400 });
    }

    // ==========================================
    // 新增防護：驗證該時段是否為「有開放」的合法時段
    // ==========================================
    
    // 1. 取得該日期的星期幾 (0=週日, 1=週一...)
    const targetDate = new Date(date);
    const dayOfWeek = targetDate.getDay();

    // 2. 查詢 time_slots_config 中，該星期幾設定的合法時段
    const { data: configData, error: configError } = await supabase
      .from('time_slots_config')
      .select('slots')
      .eq('day_of_week', dayOfWeek)
      .single();

    // 如果該天沒有設定任何時段，直接拒絕
    if (configError || !configData || !configData.slots || configData.slots.length === 0) {
      return NextResponse.json({ error: '該日期未開放預約' }, { status: 400 });
    }

    // 3. 處理字串格式，確保比對精準 (避免 "13:00:00" 和 "13:00" 不合的問題)
    const validSlots = configData.slots.map((s: string) => s.trim());
    const requestedSlotRaw = slot_time.trim();
    // 截斷秒數 (如果是 13:00:00 就只取 13:00)
    const normalizedRequestedSlot = requestedSlotRaw.length > 5 ? requestedSlotRaw.substring(0, 5) : requestedSlotRaw;

    // 4. 關鍵防線：檢查請求的時間是否在合法名單內！
    if (!validSlots.includes(normalizedRequestedSlot)) {
      console.warn(`阻擋異常預約請求：${date} ${slot_time} 不在合法時段 ${validSlots} 內`);
      return NextResponse.json({ error: '無效的預約時段，請重新整理頁面後再試' }, { status: 400 });
    }
    // ==========================================

    // 通過驗證，開始執行原有寫入邏輯
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        { 
          line_user_id, 
          customer_name, 
          customer_phone, 
          item, 
          date, 
          // 寫入資料庫時統一使用標準化過的時間 (HH:MM)，避免後續比對麻煩
          slot_time: normalizedRequestedSlot 
        }
      ])
      .select();

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: '該時段已被預約' }, { status: 409 });
      }
      throw error;
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message || '預約失敗' }, { status: 500 });
  }
}