"use client";
import { useEffect, useState } from "react";

export default function AdminBookings() {
  // --- 原本的狀態 ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 新增：底部列表用的狀態 ---
  const [allBookings, setAllBookings] = useState<any[]>([]);

  // 1. 載入單日資料 (保留原本邏輯)
  const load = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?date=${dateStr}&t=${Date.now()}`);
      const result = await res.json();
      setData(result.bookedDetails || []);
    } catch (e) {
      console.error("載入失敗", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  // 2. 新增：嘗試載入所有資料 (用於底部列表)
  // 注意：如果您還原了後端 API，這裡可能暫時只能抓到部分資料或空的，但不會讓網頁報錯
  useEffect(() => {
    const fetchAll = async () => {
      try {
        // 嘗試呼叫 API，這裡保留相容性，若 API 不支援 mode=all 則可能抓不到東西，但介面會顯示
        const res = await fetch(`/api/availability?mode=all&t=${Date.now()}`); 
        if (res.ok) {
          const result = await res.json();
          // 若後端有回傳 bookedDetails 陣列
          if (result.bookedDetails && Array.isArray(result.bookedDetails)) {
             setAllBookings(result.bookedDetails);
          }
        }
      } catch (e) {
        console.log("無法載入總覽清單 (可能是後端尚未支援)", e);
      }
    };
    fetchAll();
  }, [loading]); // 當 loading 變化時(如刪除後)嘗試重新抓取

  // 3. 取消邏輯 (保留原本邏輯)
  const handleCancel = async (time: string, name: string) => {
    if (!confirm(`確定取消 ${name} 的預約？`)) return;
    await fetch("/api/bookings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, slot_time: time, type: 'booking' }),
    });
    load(selectedDate);
  };

  // 日曆計算 (保留原本邏輯)
  const days = [];
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= lastDate; i++) days.push(i);

  return (
    <div style={s.container}>
      <button onClick={() => window.location.href='/admin'} style={s.backBtn}>⬅ 回管理中心</button>
      <h2 style={s.title}>📋 客戶預約清單</h2>

      {/* --- 日曆區塊 (保留原本樣式) --- */}
      <div style={s.calendarCard}>
        <div style={s.calHeader}>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}>◀</button>
          <span>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</span>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}>▶</button>
        </div>
        <div style={s.calGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekHead}>{d}</div>)}
          {Array(firstDay).fill(null).map((_, i) => <div key={i}></div>)}
          {days.map(d => {
            const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSel = selectedDate === dateStr;
            return (
              <div key={d} onClick={() => setSelectedDate(dateStr)} 
                style={{ ...s.dayCell, backgroundColor: isSel ? "#8c7e6d" : "transparent", color: isSel ? "#fff" : "#333" }}>
                {d}
              </div>
            );
          })}
        </div>
      </div>

      <h3 style={s.subTitle}>{selectedDate} 預約明細</h3>
      {loading ? <p>載入中...</p> : (
        data.length > 0 ? data.map((item, i) => (
          <div key={i} style={s.itemCard}>
            <div style={{ flex: 1 }}>
              <div style={s.bold}>⏰ {item.slot_time} | {item.name}</div>
              <div style={s.small}>📞 {item.phone} | 💅 {item.item}</div>
            </div>
            <button onClick={() => handleCancel(item.slot_time, item.name)} style={s.delBtn}>取消預約</button>
          </div>
        )) : <p style={s.none}>今日無預約</p>
      )}

      {/* --- 新增：最底下的「未來預約總覽」選單 --- */}
      <div style={{ marginTop: "40px", borderTop: "2px solid #eee", paddingTop: "20px" }}>
        <h3 style={{ fontSize: "16px", color: "#8c7e6d", fontWeight: "bold", marginBottom: "15px" }}>
          📅 未來預約總覽 (列表)
        </h3>
        
        <div style={s.scrollContainer}>
          {allBookings.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#ccc", fontSize: "14px" }}>
              尚無資料<br/>(請確認後端 API 是否支援全部讀取)
            </div>
          ) : (
            allBookings.map((b, idx) => (
              <div key={idx} style={s.listCard}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                  <span style={{ fontWeight: "bold", color: "#5a544e", fontSize: "16px" }}>{b.name}</span>
                  <span style={{ color: "#d97706", fontWeight: "bold", fontSize: "14px" }}>
                    {b.date || b.booking_date}
                  </span>
                </div>
                
                <div style={{ fontSize: "14px", color: "#333", marginBottom: "5px" }}>
                   ⏰ {b.slot_time} <span style={{color:"#ccc"}}>|</span> {b.item || "未填項目"}
                </div>
                
                <div style={{ fontSize: "12px", color: "#888" }}>
                  備註/電話：{b.phone}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

// 樣式表 (保留原本樣式，並加上 scrollContainer 與 listCard)
const s: any = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  backBtn: { padding: "5px 10px", borderRadius: "5px", border: "1px solid #ddd", cursor: "pointer", backgroundColor: "#fff", marginBottom: "15px" },
  title: { color: "#8c7e6d", textAlign: "center", marginBottom: "20px" },
  calendarCard: { backgroundColor: "#fff", padding: "15px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "20px" },
  calHeader: { display: "flex", justifyContent: "space-between", marginBottom: "15px", fontWeight: "bold" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" },
  weekHead: { fontSize: "12px", color: "#999", marginBottom: "10px" },
  dayCell: { padding: "10px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px" },
  subTitle: { fontSize: "16px", color: "#8c7e6d", borderBottom: "2px solid #8c7e6d", paddingBottom: "5px", marginBottom: "15px" },
  itemCard: { display: "flex", padding: "15px", backgroundColor: "#fff", marginBottom: "10px", borderRadius: "10px", borderLeft: "5px solid #8c7e6d", boxShadow: "0 2px 5px rgba(0,0,0,0.03)" },
  bold: { fontWeight: "bold" },
  small: { fontSize: "12px", color: "#666" },
  delBtn: { backgroundColor: "#ff4d4f", color: "#fff", border: "none", padding: "8px", borderRadius: "5px", cursor: "pointer" },
  none: { textAlign: "center", color: "#ccc", marginTop: "20px" },
  
  // --- 新增樣式 ---
  scrollContainer: {
    height: "350px",       // 固定高度
    overflowY: "auto",     // 產生滾輪
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "15px",
    marginBottom: "50px"
  },
  listCard: {
    backgroundColor: "#F9F9F9",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "10px",
    borderLeft: "4px solid #ccc",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  }
};