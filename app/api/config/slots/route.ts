import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

// 取得所有星期的時段設定
export async function GET() {
  const { data, error } = await supabase.from('time_slots_config').select('*').order('day_of_week');
  return NextResponse.json(data || []);
}

// 修改特定星期的時段
export async function POST(req: Request) {
  const { day_of_week, slots } = await req.json();
  const { error } = await supabase
    .from('time_slots_config')
    .upsert({ day_of_week, slots }, { onConflict: 'day_of_week' });
    
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ success: true });
}