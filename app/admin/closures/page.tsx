"use client";
import { useEffect, useState } from "react";

const TIMES = ["09:40", "13:00", "16:00", "19:20"];

export default function AdminClosures() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date());
  const [closedSlots, setClosedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 1. 讀取目前的排休清單 (對接您的 api/availability)
  const load = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?date=${dateStr}&t=${Date.now()}`);
      const result = await res.json();
      // 確保將 09:40:00 轉為 09:40 以便比對
      const formattedClosed = (result.closedOnly || []).map((t: string) => t.substring(0, 5));
      setClosedSlots(formattedClosed);
    } catch (err) {
      console.error("讀取失敗", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  // 2. 執行「新增排休」(如果您沒有 closures API，這裡通常是整合進 bookings 或專屬 API)
  // 如果您確定沒有 api/closures/route.ts，請建立該檔案，或告知我您的寫入 API 路徑
  const handleAddClosure = async (time: string) => {
    if (!confirm(`確定要關閉 ${selectedDate} ${time} 的時段嗎？`)) return;
    
    try {
      // 注意：這裡假設您需要一個 POST API 來寫入 closures 資料表
      const res = await fetch("/api/closures", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, slot_time: time }),
      });

      if (res.ok) {
        alert("時段已關閉");
        load(selectedDate);
      } else {
        alert("設定失敗");
      }
    } catch (err) {
      alert("連線異常");
    }
  };

  // 3. 執行「取消排休」(對接您的 api/bookings/delete)
  const handleOpen = async (time: string) => {
    if (!confirm(`確定恢復開放 ${time} 時段？`)) return;
    
    try {
      const res = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          date: selectedDate, 
          slot_time: time, 
          type: 'closure' // 告訴後端這是要刪除 closures 資料表的資料
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

  // 日曆邏輯
  const days = [];
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= lastDate; i++) days.push(i);

  return (
    <div style={s.container}>
      <div style={s.header}>
        <button onClick={() => window.location.href='/admin'} style={s.backBtn}>⬅ 管理中心</button>
        <h2 style={s.title}>🔒 店家排休管理</h2>
      </div>

      <div style={s.card}>
        {/* 月份切換 */}
        <div style={s.monthBar}>
          <button style={s.navBtn} onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}>◀</button>
          <div style={s.monthText}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</div>
          <button style={s.navBtn} onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}>▶</button>
        </div>

        {/* 日曆網格 */}
        <div style={s.calGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekHead}>{d}</div>)}
          {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`}></div>)}
          {days.map(d => {
            const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSel = selectedDate === dateStr;
            return (
              <button key={d} onClick={() => setSelectedDate(dateStr)} 
                style={{ 
                  ...s.dayCell, 
                  backgroundColor: isSel ? "#A89A8E" : "#fff", 
                  color: isSel ? "#fff" : "#333",
                  border: isSel ? "1.5px solid #A89A8E" : "1px solid #eee"
                }}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      <div style={{ marginTop: "20px" }}>
        <h3 style={s.sectionTitle}>📅 選取日期：{selectedDate}</h3>
        <div style={s.slotGrid}>
          {TIMES.map(t => {
            const isClosed = closedSlots.includes(t);
            return (
              <button 
                key={t} 
                onClick={() => isClosed ? handleOpen(t) : handleAddClosure(t)}
                style={{
                  ...s.slotBtn,
                  backgroundColor: isClosed ? "#f3f4f6" : "#fff",
                  color: isClosed ? "#9ca3af" : "#5a544e",
                  textDecoration: isClosed ? "line-through" : "none",
                  border: isClosed ? "1px solid #e5e7eb" : "1px solid #ddd"
                }}
              >
                {t} {isClosed ? "(已關閉)" : "(開放中)"}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, any> = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#f7f4ef", minHeight: "100vh", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", marginBottom: "20px" },
  backBtn: { padding: "6px 12px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer", backgroundColor: "#fff", marginRight: "10px", fontSize: "13px" },
  title: { fontSize: "18px", color: "#A89A8E", margin: 0 },
  card: { backgroundColor: "#fff", padding: "15px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  monthBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  monthText: { fontWeight: "bold", fontSize: "16px" },
  navBtn: { border: "none", background: "none", cursor: "pointer", fontSize: "16px", padding: "5px 10px" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px" },
  weekHead: { textAlign: "center", fontSize: "12px", color: "#999", paddingBottom: "10px" },
  dayCell: { padding: "10px 0", cursor: "pointer", borderRadius: "10px", fontSize: "14px", fontWeight: "bold" },
  sectionTitle: { fontSize: "15px", color: "#111", marginBottom: "12px", fontWeight: "bold" },
  slotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" },
  slotBtn: { padding: "18px 10px", borderRadius: "12px", cursor: "pointer", fontSize: "14px", fontWeight: "bold" }
};