"use client";
import { useEffect, useState } from "react";

const TIMES = ["09:40", "13:00", "16:00", "19:20"];

export default function AdminClosures() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date());
  const [closedSlots, setClosedSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 讀取目前的排休清單
  const load = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?date=${dateStr}&t=${Date.now()}`);
      const result = await res.json();
      // 將 "09:40:00" 統一轉成 "09:40" 比對
      const formatted = (result.closedOnly || []).map((t: string) => t.substring(0, 5));
      setClosedSlots(formatted);
    } catch (err) {
      console.error("載入失敗");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  // 切換排休狀態的核心邏輯
  const toggleSlot = async (time: string, isClosed: boolean) => {
    const actionLabel = isClosed ? "恢復開放" : "設定排休";
    if (!confirm(`確定要對 ${selectedDate} ${time} 進行 ${actionLabel} 嗎？`)) return;

    try {
      const method = isClosed ? "DELETE" : "POST";
      const url = isClosed 
        ? `/api/admin/closures?date=${selectedDate}&slot_time=${time}`
        : `/api/admin/closures`;

      const res = await fetch(url, {
        method: method,
        headers: { "Content-Type": "application/json" },
        body: isClosed ? null : JSON.stringify({ date: selectedDate, slot_time: time }),
      });

      if (res.ok) {
        alert(`${actionLabel}成功！`);
        load(selectedDate); // 刷新狀態
      } else {
        const err = await res.json();
        alert(`操作失敗: ${err.error}`);
      }
    } catch (err) {
      alert("網路連線異常");
    }
  };

  // 日曆邏輯
  const days = [];
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= lastDate; i++) days.push(i);

  return (
    <div style={s.page}>
      <button onClick={() => window.location.href='/admin'} style={s.backBtn}>⬅ 管理中心</button>
      <h2 style={s.title}>🔒 店家排休管理</h2>

      {/* 日曆區塊 */}
      <div style={s.card}>
        <div style={s.monthBar}>
          <button style={s.navBtn} onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}>◀</button>
          <div style={{fontWeight: "bold", fontSize: "18px"}}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</div>
          <button style={s.navBtn} onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}>▶</button>
        </div>

        <div style={s.calendarGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekHead}>{d}</div>)}
          {Array(firstDay).fill(null).map((_, i) => <div key={`e-${i}`} />)}
          {days.map(d => {
            const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSel = selectedDate === dateStr;
            return (
              <button key={d} onClick={() => setSelectedDate(dateStr)} 
                style={{ 
                  ...s.dayCell, 
                  backgroundColor: isSel ? "#8c7e6d" : "#fff", 
                  color: isSel ? "#fff" : "#333",
                  border: isSel ? "1.5px solid #8c7e6d" : "1.5px solid #eee"
                }}>
                {d}
              </button>
            );
          })}
        </div>
      </div>

      {/* 時段設定區塊 */}
      <div style={{ marginTop: "24px" }}>
        <h3 style={s.sectionTitle}>📅 {selectedDate} 時段設定</h3>
        <div style={s.slotGrid}>
          {TIMES.map(t => {
            const isClosed = closedSlots.includes(t);
            return (
              <button 
                key={t} 
                onClick={() => toggleSlot(t, isClosed)}
                style={{
                  ...s.slotBtn,
                  backgroundColor: isClosed ? "#fee2e2" : "#f0fdf4",
                  color: isClosed ? "#b91c1c" : "#166534",
                  borderColor: isClosed ? "#fca5a5" : "#bbf7d0",
                  textDecoration: isClosed ? "line-through" : "none"
                }}
              >
                <div style={{fontSize: "16px", fontWeight: "bold"}}>{t}</div>
                <div style={{fontSize: "12px"}}>{isClosed ? "已關閉 (點擊恢復)" : "開放中 (點擊排休)"}</div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s: Record<string, any> = {
  page: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#fcfaf7", minHeight: "100vh", fontFamily: "sans-serif" },
  backBtn: { padding: "8px 16px", borderRadius: "8px", border: "1px solid #ddd", cursor: "pointer", backgroundColor: "#fff", marginBottom: "16px" },
  title: { color: "#8c7e6d", textAlign: "center", marginBottom: "20px" },
  card: { backgroundColor: "#fff", padding: "20px", borderRadius: "16px", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" },
  monthBar: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  navBtn: { border: "1px solid #ddd", background: "#fff", padding: "5px 12px", borderRadius: "6px", cursor: "pointer" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "8px" },
  weekHead: { textAlign: "center", fontSize: "12px", color: "#999", paddingBottom: "10px" },
  dayCell: { padding: "12px 0", cursor: "pointer", borderRadius: "10px", fontSize: "14px", fontWeight: "bold" },
  sectionTitle: { fontSize: "16px", color: "#555", marginBottom: "12px", fontWeight: "bold" },
  slotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  slotBtn: { padding: "16px 10px", borderRadius: "12px", border: "2px solid", cursor: "pointer", display: "flex", flexDirection: "column", alignItems: "center", gap: "4px" }
};