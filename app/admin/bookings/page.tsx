"use client";
import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

// 初始化 Supabase (直接在前端調用以確保最快讀取)
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminBookings() {
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 1. 抓取函數：不設日期限制，抓取資料庫內所有預約
  const fetchAllData = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .order('date', { ascending: false }) // 日期近的排在上面
      .order('slot_time', { ascending: true });

    if (!error) {
      setBookings(data || []);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchAllData();
  }, []);

  // 刪除邏輯
  const handleDelete = async (id: string) => {
    if (!confirm("確定要取消這筆預約嗎？")) return;
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (!error) {
      alert("已成功刪除預約");
      fetchAllData();
    }
  };

  return (
    <div style={s.container}>
      <h2 style={s.title}>📋 預約名單總管理</h2>
      <p style={{textAlign:'center', fontSize:'12px', color:'#999'}}>目前顯示：所有月份預約紀錄</p>

      {loading ? (
        <div style={{textAlign:'center', padding:'40px'}}>載入資料中...</div>
      ) : (
        <div style={s.listContainer}>
          {bookings.length === 0 ? (
            <div style={{textAlign:'center', padding:'40px', color:'#ccc'}}>資料庫中查無預約紀錄</div>
          ) : (
            bookings.map((b) => (
              <div key={b.id} style={s.bookingCard}>
                <div style={s.cardHeader}>
                  <span style={s.dateTag}>{b.date}</span>
                  <span style={s.timeTag}>{b.slot_time}</span>
                </div>
                <div style={s.cardBody}>
                  <p><strong>客戶姓名：</strong>{b.customer_name}</p>
                  <p><strong>卸甲需求：</strong>{b.customer_phone}</p>
                  <p><strong>施作項目：</strong>{b.item}</p>
                </div>
                <button onClick={() => handleDelete(b.id)} style={s.deleteBtn}>取消預約</button>
              </div>
            ))
          )}
        </div>
      )}
      
      <button onClick={() => window.history.back()} style={s.backBtn}>返回管理中心</button>
    </div>
  );
}

const s = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  title: { color: "#8c7e6d", textAlign: "center" as any, marginBottom: "10px" },
  listContainer: { marginTop: "20px" },
  bookingCard: { backgroundColor: "#fff", padding: "15px", borderRadius: "12px", marginBottom: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", position: "relative" as any },
  cardHeader: { display: "flex", gap: "10px", marginBottom: "10px" },
  dateTag: { backgroundColor: "#8c7e6d", color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "13px" },
  timeTag: { backgroundColor: "#eee", color: "#555", padding: "2px 8px", borderRadius: "4px", fontSize: "13px" },
  cardBody: { fontSize: "14px", color: "#5a544e", lineHeight: "1.6" },
  deleteBtn: { marginTop: "10px", width: "100%", padding: "8px", backgroundColor: "#fff", color: "#ff4d4f", border: "1px solid #ff4d4f", borderRadius: "6px", cursor: "pointer" },
  backBtn: { width: "100%", marginTop: "30px", padding: "12px", border: "none", background: "none", color: "#999", textDecoration: "underline", cursor: "pointer" }
};