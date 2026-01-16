"use client";
import { useEffect, useState } from "react";

export default function AdminBookings() {
  // --- 原本的狀態 ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date());
  const [data, setData] = useState<any[]>([]); // 單日資料
  const [loading, setLoading] = useState(false);

  // --- 新增：所有預約資料 (滾輪清單用) ---
  const [allBookings, setAllBookings] = useState<any[]>([]);

  // 1. 載入單日資料 (原本的邏輯)
  const load = async (dateStr: string) => {
    setLoading(true);
    try {
      // 呼叫原本的 API
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

  // 2. 載入「所有」預約 (呼叫同一個 API，但帶入 mode=all)
  const fetchAll = async () => {
    try {
      // 這裡改用同一個 API，確保能抓到資料
      const res = await fetch("/api/availability?mode=all&t=" + Date.now());
      const result = await res.json();
      
      if (result.bookedDetails && Array.isArray(result.bookedDetails)) {
        setAllBookings(result.bookedDetails);
      }
    } catch (e) {
      console.error("無法載入所有預約", e);
    }
  };

  // 頁面載入時執行一次
  useEffect(() => {
    fetchAll();
  }, []); // 空陣列代表只執行一次

  // 3. 取消預約 (成功後同時更新上面和下面)
  const handleCancel = async (time: string, name: string) => {
    if (!confirm(`確定取消 ${name} 的預約？`)) return;
    
    await fetch("/api/bookings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, slot_time: time, type: 'booking' }),
    });

    // 兩邊都重新整理
    load(selectedDate); 
    fetchAll(); 
  };

  // 日曆計算 (保持不變)
  const days = [];
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= lastDate; i++) days.push(i);

  return (
    <div style={s.container}>
      <button onClick={() => window.location.href='/admin'} style={s.backBtn}>⬅ 回管理中心</button>
      <h2 style={s.title}>📋 客戶預約清單</h2>

      {/* --- 日曆 (保持不變) --- */}
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

      {/* --- 下方滾輪清單 (資料來源改成 allBookings) --- */}
      <div style={{ marginTop: "40px", borderTop: "2px solid #eee", paddingTop: "20px" }}>
        <h3 style={{ fontSize: "16px", color: "#5a544e", fontWeight: "bold", marginBottom: "10px" }}>
          📅 未來預約總覽 (由近到遠)
        </h3>
        
        <div style={s.scrollContainer}>
          {allBookings.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
              目前沒有未來預約
            </div>
          ) : (
            allBookings.map((b, idx) => (
              <div key={idx} style={s.listCard}>
                {/* 姓名 */}
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#5a544e", marginBottom: "5px" }}>
                  {b.name}
                </div>
                
                {/* 日期時間 */}
                <div style={{ fontSize: "14px", color: "#d97706", fontWeight: "bold", marginBottom: "5px" }}>
                  {b.date} &nbsp; {b.slot_time}
                </div>
                
                {/* 項目 */}
                <div style={{ fontSize: "15px", color: "#333", marginBottom: "5px" }}>
                  {b.item || "未填寫項目"}
                </div>
                
                {/* 電話 */}
                <div style={{ fontSize: "13px", color: "#888" }}>
                  電話/卸甲：{b.phone}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

// 樣式表 (與之前相同)
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
  // 新增的清單樣式
  scrollContainer: {
    maxHeight: "400px",    
    overflowY: "auto",     
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "15px"
  },
  listCard: {
    backgroundColor: "#F5F5F5", 
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "12px",
    borderLeft: "5px solid #8c7e6d", 
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  }
};