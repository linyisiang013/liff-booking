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

    // 1. 寫入資料庫 (Supabase)
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
      console.error("Supabase Write Error:", error);
      // 如果是重複預約 (違反 Unique 約束)，回傳特定錯誤
      if (error.code === '23505') {
        return NextResponse.json({ error: '該時段稍早在大約 1 秒前被搶走了！請選擇其他時段。' }, { status: 409 });
      }
      throw error;
    }

    // 2. 發送 LINE 通知 (通知官方帳號 / 管理員 / 用戶)
    // 這裡使用 "Push Message" 給預約的用戶確認，或 "Broadcast" 給管理員
    const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;
    
    if (token) {
      // 這裡發送給「預約的客戶」確認訊息
      // 如果您希望通知「管理員」，通常需要管理員的 User ID，或者使用 LINE Notify Token
      // 這裡示範發送給當前操作的用戶 (line_user_id)
      await fetch('https://api.line.me/v2/bot/message/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          to: line_user_id,
          messages: [
            {
              type: 'text',
              text: `【預約成功確認】\n\n感謝 ${customer_name} 的預約！\n日期：${date}\n時間：${slot_time}\n項目：${item}\n\n請準時光臨，若需更改請直接傳訊聯繫。`
            }
          ]
        })
      });
      
      // 如果您先前是用 Broadcast (廣播) 來通知管理員，請取消註解下面這段：
      /*
      await fetch('https://api.line.me/v2/bot/message/broadcast', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          messages: [{ type: 'text', text: `🔔 新增一筆預約！\n${date} ${slot_time}\n${customer_name} (${item})` }]
        })
      });
      */
    }

    return NextResponse.json({ success: true, data });

  } catch (error: any) {
    console.error("Server Error:", error);
    return NextResponse.json({ error: error.message || '預約失敗' }, { status: 500 });
  }
}