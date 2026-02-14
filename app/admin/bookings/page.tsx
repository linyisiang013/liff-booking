"use client";
import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminBookings() {
  // 預設選中今天
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  
  // 日曆視圖控制
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 當選定日期改變時，讀取該日期的預約
  useEffect(() => {
    const fetchDayBookings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('date', selectedDate)
        .order('slot_time', { ascending: true });
        
      if (!error) {
        setBookings(data || []);
      }
      setLoading(false);
    };
    fetchDayBookings();
  }, [selectedDate]);

  const handleDelete = async (id: string) => {
    if (!confirm("確定要取消這筆預約嗎？")) return;
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (!error) {
      // 成功刪除後，從畫面移除
      setBookings(bookings.filter(b => b.id !== id));
    } else {
      alert("刪除失敗");
    }
  };

  // 日曆計算邏輯
  const calendarDays = (() => {
    const days = [];
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    // 補齊前面的空白 (如果一號不是週日)
    const firstDayIndex = date.getDay(); 
    
    // 產生當月日期
    while (date.getMonth() === viewDate.getMonth()) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return { days, firstDayIndex };
  })();

  const { days, firstDayIndex } = calendarDays;

  return (
    <div style={s.container}>
      <h2 style={s.title}>📋 預約名單管理</h2>

      {/* 日曆區塊 */}
      <div style={s.card}>
        <div style={s.calendarHeader}>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={s.navBtn}>◀</button>
          <b style={{fontSize: "16px"}}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</b>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={s.navBtn}>▶</button>
        </div>
        
        <div style={s.calendarGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekLabel}>{d}</div>)}
          
          {/* 空白填充 */}
          {Array(firstDayIndex).fill(null).map((_, i) => <div key={`empty-${i}`}></div>)}
          
          {/* 日期按鈕 */}
          {days.map(day => {
            const ds = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
            const isSelected = selectedDate === ds;
            return (
              <div key={ds} onClick={() => setSelectedDate(ds)} 
                style={{ ...s.dayCell, backgroundColor: isSelected ? "#8c7e6d" : "transparent", color: isSelected ? "#fff" : "#5a544e" }}>
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </div>

      {/* 預約明細區塊 */}
      <div style={{marginTop: "20px"}}>
        <h4 style={s.sectionTitle}>{selectedDate} 預約明細</h4>
        <div style={s.detailSection}>
          {loading ? <p style={s.infoText}>載入中...</p> : 
           bookings.length > 0 ? bookings.map(b => (
            <div key={b.id} style={s.bookingItem}>
              <div style={s.bookingInfo}>
                <div style={s.timeName}>⏰ {b.slot_time} | {b.customer_name}</div>
                <div style={s.subInfo}>📞 {b.customer_phone} | 💅 {b.item}</div>
              </div>
              <button onClick={() => handleDelete(b.id)} style={s.cancelBtn}>取消預約</button>
            </div>
          )) : <p style={s.infoText}>今日無預約</p>}
        </div>
      </div>

      <button onClick={() => window.location.href = '/admin'} style={s.backBtn}>返回管理中心</button>
    </div>
  );
}

const s = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  title: { color: "#8c7e6d", textAlign: "center" as any, marginBottom: "20px" },
  
  // 卡片樣式
  card: { backgroundColor: "#fff", padding: "15px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  
  // 日曆樣式
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", padding: "0 10px" },
  navBtn: { border: "none", background: "none", fontSize: "18px", cursor: "pointer", color: "#555" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" as any, gap: "5px" },
  weekLabel: { fontSize: "12px", color: "#999", paddingBottom: "10px" },
  dayCell: { padding: "8px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px", transition: "0.2s" },
  
  // 列表樣式
  sectionTitle: { color: "#8c7e6d", borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "15px" },
  detailSection: { minHeight: "100px" },
  infoText: { textAlign: "center" as any, color: "#ccc", padding: "20px" },
  
  // 單筆預約卡片
  bookingItem: { display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: "15px", borderRadius: "10px", marginBottom: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.03)", borderLeft: "4px solid #8c7e6d" },
  bookingInfo: { flex: 1 },
  timeName: { fontWeight: "bold" as any, fontSize: "15px", color: "#333", marginBottom: "4px" },
  subInfo: { fontSize: "12px", color: "#888" },
  cancelBtn: { padding: "6px 12px", backgroundColor: "#ff4d4f", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  
  backBtn: { width: "100%", marginTop: "30px", padding: "12px", border: "none", background: "none", color: "#999", textDecoration: "underline", cursor: "pointer" }
};