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

    // 只做資料庫寫入，不發送 LINE Push API
    const { data, error } = await supabase
      .from('bookings')
      .insert([
        { 
          line_user_id, 
          customer_name, 
          customer_phone, 
          item, 
          date, 
          slot_time 
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