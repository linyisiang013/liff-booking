"use client";
import { useEffect, useState } from "react";

const TIMES = ["09:40", "13:00", "16:00", "19:20"];
const WEEKS = ["日", "一", "二", "三", "四", "五", "六"];

export default function AdminCalendarPage() {
  const [viewDate, setViewDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [status, setStatus] = useState({ booked: [] as any[], closed: [] as string[] });

  const fetchData = async () => {
    try {
      const res = await fetch(`/api/availability?date=${selectedDate}&t=${Date.now()}`);
      const d = await res.json();
      // 強制對齊資料
      setStatus({ 
        booked: d.bookedDetails || [], 
        closed: d.closedOnly || [] 
      });
    } catch (e) { console.error("抓取失敗", e); }
  };

  useEffect(() => { fetchData(); }, [selectedDate]);

  const handleAction = async (type: 'cancel_booking' | 'toggle_closure', slot: string) => {
    if (!confirm("確定要執行操作嗎？")) return;
    const res = await fetch("/api/admin/manage", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ type, date: selectedDate, slot_time: slot })
    });
    if (res.ok) fetchData();
  };

  return (
    <div style={{ backgroundColor: "#f8f5f2", minHeight: "100vh", padding: "20px", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", color: "#8c7e6d", marginBottom: "20px" }}>安指 say_nail 管理員後台系統</h2>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "20px", justifyContent: "center", maxWidth: "1200px", margin: "0 auto" }}>
        
        {/* 左側日曆 */}
        <div style={{ flex: "1 1 400px", backgroundColor: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "20px" }}>
            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() - 1)))} style={s.navBtn}>上個月</button>
            <span style={{ fontWeight: "bold" }}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</span>
            <button onClick={() => setViewDate(new Date(viewDate.setMonth(viewDate.getMonth() + 1)))} style={s.navBtn}>下個月</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" }}>
            {WEEKS.map(w => <div key={w} style={{ color: "#a0958a", fontSize: "14px", paddingBottom: "10px" }}>{w}</div>)}
            {/* 這裡省略 renderDays 邏輯以簡化空間，請保留您原本的 renderDays 代碼 */}
            {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay() }).map((_, i) => <div key={i} />)}
            {Array.from({ length: new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate() }).map((_, i) => {
              const d = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(i + 1).padStart(2, '0')}`;
              return (
                <div key={i} onClick={() => setSelectedDate(d)} style={{
                  padding: "12px 0", cursor: "pointer", borderRadius: "10px",
                  backgroundColor: selectedDate === d ? "#8c7e6d" : "transparent",
                  color: selectedDate === d ? "#fff" : "#5a544e"
                }}>{i + 1}</div>
              );
            })}
          </div>
        </div>

        {/* 右側管理：顯示預約資訊 */}
        <div style={{ flex: "1 1 400px", backgroundColor: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" }}>
          <h3 style={{ borderLeft: "4px solid #8c7e6d", paddingLeft: "15px", marginBottom: "20px" }}>{selectedDate} 時段管理</h3>
          {TIMES.map(t => {
            // 像排休一樣做字串比對
            const tStr = String(t);
            const booking = status.booked.find(b => String(b.slot_time) === tStr);
            const isClosed = status.closed.includes(tStr);
            
            return (
              <div key={t} style={{ padding: "15px", borderBottom: "1px solid #f5f5f5", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold" }}>{t}</div>
                  {booking ? (
                    <div style={{ fontSize: "13px", color: "#d9534f", marginTop: "5px", background: "#fff5f5", padding: "8px", borderRadius: "8px" }}>
                      <strong>👤 預約：{booking.name}</strong><br/>
                      📞 電話：{booking.phone}<br/>
                      📝 項目：{booking.item || "未填"}
                    </div>
                  ) : isClosed ? (
                    <div style={{ fontSize: "13px", color: "#f0ad4e", marginTop: "4px" }}>🚫 目前為「手動關閉」</div>
                  ) : (
                    <div style={{ fontSize: "13px", color: "#5cb85c", marginTop: "4px" }}>✅ 正常開放中</div>
                  )}
                </div>
                <div>
                  {booking ? (
                    <button onClick={() => handleAction('cancel_booking', t)} style={s.btnDanger}>取消預約</button>
                  ) : (
                    <button onClick={() => handleAction('toggle_closure', t)} style={isClosed ? s.btnOpen : s.btnClose}>
                      {isClosed ? "重新開放" : "關閉時段"}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

const s: any = {
  navBtn: { border: "1px solid #eee", padding: "6px 15px", borderRadius: "8px", backgroundColor: "#fff", cursor: "pointer" },
  btnDanger: { backgroundColor: "#ff4d4f", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer" },
  btnClose: { backgroundColor: "#8c7e6d", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer" },
  btnOpen: { backgroundColor: "#5cb85c", color: "#fff", border: "none", padding: "8px 12px", borderRadius: "6px", cursor: "pointer" }
};