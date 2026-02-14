"use client";
import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminBookings() {
  // 狀態管理
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dayBookings, setDayBookings] = useState<any[]>([]); // 選中日期的預約
  const [futureBookings, setFutureBookings] = useState<any[]>([]); // 未來總覽
  const [loading, setLoading] = useState(false);
  
  // 日曆視圖控制
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 1. 讀取「選中日期」的預約 (日曆點擊用)
  useEffect(() => {
    const fetchDayBookings = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('date', selectedDate)
        .order('slot_time', { ascending: true });
        
      if (!error) setDayBookings(data || []);
      setLoading(false);
    };
    fetchDayBookings();
  }, [selectedDate]);

  // 2. 讀取「未來所有」預約 (下方總覽用)
  const fetchFutureBookings = async () => {
    const today = new Date().toISOString().split('T')[0];
    const { data, error } = await supabase
      .from('bookings')
      .select('*')
      .gte('date', today) // 包含今天與未來
      .order('date', { ascending: true })
      .order('slot_time', { ascending: true })
      .limit(50); // 只顯示最近 50 筆，避免太長

    if (!error) setFutureBookings(data || []);
  };

  useEffect(() => {
    fetchFutureBookings();
  }, []); // 只在進入頁面時抓一次

  // 刪除功能 (同時更新兩邊的列表)
  const handleDelete = async (id: string) => {
    if (!confirm("確定要取消這筆預約嗎？")) return;
    
    const { error } = await supabase.from('bookings').delete().eq('id', id);
    if (!error) {
      alert("已取消預約");
      // 更新畫面
      setDayBookings(dayBookings.filter(b => b.id !== id));
      setFutureBookings(futureBookings.filter(b => b.id !== id));
    } else {
      alert("刪除失敗");
    }
  };

  // 日曆計算邏輯
  const calendarDays = (() => {
    const days = [];
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstDayIndex = date.getDay(); 
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

      {/* --- 上半部：日曆與單日查詢 --- */}
      <div style={s.card}>
        <div style={s.calendarHeader}>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={s.navBtn}>◀</button>
          <b style={{fontSize: "16px"}}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</b>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={s.navBtn}>▶</button>
        </div>
        
        <div style={s.calendarGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekLabel}>{d}</div>)}
          {Array(firstDayIndex).fill(null).map((_, i) => <div key={`empty-${i}`}></div>)}
          {days.map(day => {
            const ds = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
            const isSelected = selectedDate === ds;
            // 檢查這天是否有預約 (用來顯示小紅點)
            const hasBooking = futureBookings.some(b => b.date === ds);

            return (
              <div key={ds} onClick={() => setSelectedDate(ds)} 
                style={{ 
                  ...s.dayCell, 
                  backgroundColor: isSelected ? "#8c7e6d" : "transparent", 
                  color: isSelected ? "#fff" : "#5a544e",
                  fontWeight: hasBooking ? "bold" : "normal"
                }}>
                {day.getDate()}
                {hasBooking && !isSelected && <div style={s.dot}></div>}
              </div>
            );
          })}
        </div>
      </div>

      {/* 單日預約明細 */}
      <div style={{marginTop: "20px", marginBottom: "40px"}}>
        <h4 style={s.sectionTitle}>{selectedDate} 當日預約</h4>
        <div style={s.detailSection}>
          {loading ? <p style={s.infoText}>載入中...</p> : 
           dayBookings.length > 0 ? dayBookings.map(b => (
            <BookingCard key={b.id} data={b} onDelete={() => handleDelete(b.id)} />
          )) : <p style={s.infoText}>此日無預約</p>}
        </div>
      </div>

      {/* --- 下半部：未來預約總覽 (您要補回的功能) --- */}
      <h4 style={s.sectionTitle}>📅 未來預約總覽 (近期)</h4>
      <div style={s.futureList}>
        {futureBookings.length === 0 ? (
          <p style={s.infoText}>目前沒有任何未來預約</p>
        ) : (
          futureBookings.map((b) => (
            <div key={b.id} style={s.futureItem}>
              <div style={s.futureDateBadge}>
                <span style={{fontSize:'12px', display:'block'}}>{b.date.split('-')[1]}/{b.date.split('-')[2]}</span>
                <span style={{fontWeight:'bold'}}>{b.slot_time}</span>
              </div>
              <div style={{flex: 1, paddingLeft: '10px'}}>
                <div style={{fontWeight:'bold', color: '#5a544e'}}>{b.customer_name}</div>
                <div style={{fontSize:'12px', color: '#888'}}>{b.item}</div>
              </div>
              <button onClick={() => handleDelete(b.id)} style={s.smDelBtn}>✕</button>
            </div>
          ))
        )}
      </div>

      <button onClick={() => window.location.href = '/admin'} style={s.backBtn}>返回管理中心</button>
    </div>
  );
}

// 抽離出卡片組件保持整潔
const BookingCard = ({ data, onDelete }: { data: any, onDelete: () => void }) => (
  <div style={s.bookingItem}>
    <div style={s.bookingInfo}>
      <div style={s.timeName}>⏰ {data.slot_time} | {data.customer_name}</div>
      <div style={s.subInfo}>📞 {data.customer_phone} | 💅 {data.item}</div>
    </div>
    <button onClick={onDelete} style={s.cancelBtn}>取消</button>
  </div>
);

const s = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  title: { color: "#8c7e6d", textAlign: "center" as any, marginBottom: "20px" },
  card: { backgroundColor: "#fff", padding: "15px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", padding: "0 10px" },
  navBtn: { border: "none", background: "none", fontSize: "18px", cursor: "pointer", color: "#555" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" as any, gap: "5px" },
  weekLabel: { fontSize: "12px", color: "#999", paddingBottom: "10px" },
  dayCell: { padding: "8px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px", position: "relative" as any },
  dot: { width: "4px", height: "4px", backgroundColor: "#ff4d4f", borderRadius: "50%", margin: "2px auto 0" },
  
  sectionTitle: { color: "#8c7e6d", borderBottom: "1px solid #ddd", paddingBottom: "10px", marginBottom: "15px", marginTop: "10px" },
  detailSection: { minHeight: "50px" },
  infoText: { textAlign: "center" as any, color: "#ccc", padding: "20px" },
  
  // 卡片樣式
  bookingItem: { display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "#fff", padding: "15px", borderRadius: "10px", marginBottom: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.03)", borderLeft: "4px solid #8c7e6d" },
  bookingInfo: { flex: 1 },
  timeName: { fontWeight: "bold" as any, fontSize: "15px", color: "#333", marginBottom: "4px" },
  subInfo: { fontSize: "12px", color: "#888" },
  cancelBtn: { padding: "6px 12px", backgroundColor: "#ff4d4f", color: "#fff", border: "none", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  
  // 未來總覽列表樣式
  futureList: { backgroundColor: "#fff", borderRadius: "15px", padding: "10px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  futureItem: { display: "flex", alignItems: "center", padding: "12px 0", borderBottom: "1px solid #f0f0f0" },
  futureDateBadge: { backgroundColor: "#f5f5f5", padding: "5px 10px", borderRadius: "8px", textAlign: "center" as any, color: "#5a544e", minWidth: "60px" },
  smDelBtn: { border: "none", background: "none", color: "#ccc", fontSize: "18px", cursor: "pointer", padding: "0 10px" },

  backBtn: { width: "100%", marginTop: "30px", padding: "12px", border: "none", background: "none", color: "#999", textDecoration: "underline", cursor: "pointer" }
};