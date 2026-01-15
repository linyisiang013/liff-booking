"use client";
import { useEffect, useState } from "react";

const TIMES = ["09:40", "13:00", "16:00", "19:20"];

export default function AdminClosures() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date());
  const [closedSlots, setClosedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. 讀取目前的排休清單
  const load = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?date=${dateStr}&t=${Date.now()}`);
      const result = await res.json();
      // 確保將 09:40:00 轉為 09:40 以便比對按鈕狀態
      const formattedClosed = (result.closedOnly || []).map((t: string) => t.substring(0, 5));
      setClosedSlots(formattedClosed);
    } catch (err) {
      console.error("讀取失敗", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  // 2. 執行「新增排休」(關閉時段)
  const handleAddClosure = async (time: string) => {
    if (!confirm(`確定要關閉 ${selectedDate} ${time} 的時段嗎？`)) return;
    
    try {
      const res = await fetch("/api/closures", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          date: selectedDate, 
          slot_time: time // 這裡傳入 09:40
        }),
      });

      if (res.ok) {
        alert("時段已關閉");
        load(selectedDate);
      } else {
        const err = await res.json();
        alert("設定失敗: " + (err.error || "未知錯誤"));
      }
    } catch (err) {
      alert("連線異常");
    }
  };

  // 3. 執行「取消排休」(恢復開放)
  const handleOpen = async (time: string) => {
    if (!confirm(`確定恢復開放 ${time} 時段？`)) return;
    
    try {
      const res = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          date: selectedDate, 
          slot_time: time, 
          type: 'closure' 
        }),
      });

      if (res.ok) {
        alert("時段已恢復開放");
        load(selectedDate);
      } else {
        alert("操作失敗");
      }
    } catch (err) {
      alert("連線異常");
    }
  };

  // 日曆產生邏輯
  const days = [];
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= lastDate; i++) days.push(i);

  return (
    <div style={s.container}>
      <button onClick={() => window.location.href='/admin'} style={s.backBtn}>⬅ 回管理中心</button>
      <h2 style={{ ...s.title, color: "#A89A8E" }}>🔒 店家排休管理</h2>

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
                style={{ ...s.dayCell, backgroundColor: isSel ? "#A89A8E" : "transparent", color: isSel ? "#fff" : "#333" }}>
                {d}
              </div>
            );
          })}
        </div>
      </div>

      <h3 style={{ ...s.subTitle, color: "#A89A8E", borderBottom: "2px solid #A89A8E" }}>{selectedDate} 排休設定</h3>
      
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px", marginBottom: "20px" }}>
        {TIMES.map(t => {
          const isClosed = closedSlots.includes(t);
          return (
            <button key={t} 
              onClick={() => isClosed ? handleOpen(t) : handleAddClosure(t)}
              style={{
                padding: "20px 10px", borderRadius: "10px", border: isClosed ? "none" : "1px solid #ddd", 
                fontWeight: "bold", cursor: "pointer", fontSize: "15px",
                backgroundColor: isClosed ? "#eee" : "#fff",
                color: isClosed ? "#ccc" : "#5a544e",
                textDecoration: isClosed ? "line-through" : "none"
              }}>
              {t} {isClosed ? "(已關閉)" : "(開放中)"}
            </button>
          );
        })}
      </div>
      <p style={{ textAlign: "center", fontSize: "12px", color: "#999" }}>點擊上方按鈕可切換「開放」或「排休」狀態</p>
    </div>
  );
}

const s: any = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  backBtn: { padding: "5px 10px", borderRadius: "5px", border: "1px solid #ddd", cursor: "pointer", backgroundColor: "#fff", marginBottom: "15px" },
  title: { color: "#8c7e6d", textAlign: "center", marginBottom: "20px" },
  calendarCard: { backgroundColor: "#fff", padding: "15px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "20px" },
  calHeader: { display: "flex", justifyContent: "space-between", marginBottom: "15px", fontWeight: "bold" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" },
  weekHead: { fontSize: "12px", color: "#999", marginBottom: "10px" },
  dayCell: { padding: "10px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px" },
  subTitle: { fontSize: "16px", color: "#8c7e6d", borderBottom: "2px solid #8c7e6d", paddingBottom: "5px", marginBottom: "15px" }
};