"use client";
import { useEffect, useState } from "react";

export default function AdminBookingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availability, setAvailability] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 獲取資料（包含預約細節與排休清單）
  const fetchAdminData = async (date: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?date=${date}&t=${Date.now()}`);
      const data = await res.json();
      setAvailability(data); // 包含 bookedDetails 與 closedOnly
    } catch (err) {
      console.error("讀取失敗", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData(selectedDate);
  }, [selectedDate]);

  // 通用的刪除處理（可用於預約或排休）
  const handleDelete = async (slotTime: string, type: 'booking' | 'closure', label: string) => {
    if (!confirm(`確定要取消 ${label} 嗎？`)) return;

    try {
      const res = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, slot_time: slotTime, type }),
      });

      if (res.ok) {
        alert("已移除");
        fetchAdminData(selectedDate);
      } else {
        alert("操作失敗");
      }
    } catch (err) {
      alert("系統異常");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#FAF9F6", minHeight: "100vh" }}>
      <h2 style={{ color: "#8c7e6d", textAlign: "center" }}>安指 say_nail 管理後台</h2>

      {/* 日期選擇 */}
      <div style={s.section}>
        <label style={s.label}>檢視日期：</label>
        <input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} style={s.input} />
      </div>

      {loading ? <p style={{ textAlign: "center" }}>載入中...</p> : (
        <>
          {/* --- 部分 A：已預約名單 --- */}
          <h3 style={s.title}>📋 客戶預約清單</h3>
          {availability?.bookedDetails?.length > 0 ? (
            availability.bookedDetails.map((item: any, idx: number) => (
              <div key={`book-${idx}`} style={s.card}>
                <div style={{ flex: 1 }}>
                  <div style={s.timeInfo}>⏰ {item.slot_time} | {item.name}</div>
                  <div style={s.subInfo}>📞 {item.phone} | 💅 {item.item}</div>
                </div>
                <button onClick={() => handleDelete(item.slot_time, 'booking', `${item.name} 的預約`)} style={s.cancelBtn}>取消預約</button>
              </div>
            ))
          ) : <p style={s.emptyText}>今日無客戶預約</p>}

          {/* --- 部分 B：管理員排休 (恢復功能) --- */}
          <h3 style={{ ...s.title, marginTop: "30px", borderBottom: "2px solid #A89A8E" }}>📅 已設定休假/關閉時段</h3>
          {availability?.closedOnly?.length > 0 ? (
            availability.closedOnly.map((slot: string, idx: number) => (
              <div key={`close-${idx}`} style={{ ...s.card, borderLeft: "5px solid #A89A8E" }}>
                <div style={{ flex: 1, fontWeight: "bold" }}>🔒 {slot} (已關閉)</div>
                <button onClick={() => handleDelete(slot, 'closure', `${slot} 的休假時段`)} style={s.restoreBtn}>恢復開放</button>
              </div>
            ))
          ) : <p style={s.emptyText}>今日無手動休假時段</p>}
        </>
      )}
    </div>
  );
}

const s = {
  section: { marginBottom: "20px", backgroundColor: "#fff", padding: "15px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" },
  label: { display: "block", marginBottom: "8px", fontWeight: "bold" as any },
  input: { width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd", boxSizing: "border-box" as any },
  title: { fontSize: "16px", color: "#8c7e6d", borderBottom: "2px solid #8c7e6d", paddingBottom: "5px", marginBottom: "15px" },
  card: { display: "flex", alignItems: "center", backgroundColor: "#fff", padding: "15px", borderRadius: "10px", marginBottom: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.03)", borderLeft: "5px solid #8c7e6d" },
  timeInfo: { fontWeight: "bold", fontSize: "15px" },
  subInfo: { fontSize: "12px", color: "#666", marginTop: "4px" },
  emptyText: { textAlign: "center", color: "#ccc", padding: "20px" },
  cancelBtn: { backgroundColor: "#ff4d4f", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" },
  restoreBtn: { backgroundColor: "#8c7e6d", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }
};