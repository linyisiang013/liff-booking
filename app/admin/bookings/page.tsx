"use client";
import { useEffect, useState } from "react";

export default function AdminBookings() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState<any[]>([]);

  const load = async () => {
    const res = await fetch(`/api/availability?date=${date}&t=${Date.now()}`);
    const result = await res.json();
    setData(result.bookedDetails || []);
  };

  useEffect(() => { load(); }, [date]);

  const handleCancel = async (time: string, name: string) => {
    if (!confirm(`確定取消 ${name} 的預約？`)) return;
    await fetch("/api/bookings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, slot_time: time, type: 'booking' }),
    });
    load();
  };

  return (
    <div style={s.container}>
      <h2 style={s.title}>📅 客戶預約清單管理</h2>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={s.input} />
      {data.length > 0 ? data.map((item, i) => (
        <div key={i} style={s.card}>
          <div style={{ flex: 1 }}>
            <div style={s.bold}>⏰ {item.slot_time} | {item.name}</div>
            <div style={s.small}>📞 {item.phone} | 💅 {item.item}</div>
          </div>
          <button onClick={() => handleCancel(item.slot_time, item.name)} style={s.delBtn}>取消預約</button>
        </div>
      )) : <p style={s.none}>今日無人預約</p>}
    </div>
  );
}

const s = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh" },
  title: { color: "#8c7e6d", textAlign: "center" as any },
  input: { width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #ddd" },
  card: { display: "flex", padding: "15px", backgroundColor: "#fff", marginBottom: "10px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)", borderLeft: "5px solid #8c7e6d" },
  bold: { fontWeight: "bold" as any, fontSize: "15px" },
  small: { fontSize: "12px", color: "#666" },
  delBtn: { backgroundColor: "#ff4d4f", color: "#fff", border: "none", padding: "8px", borderRadius: "5px", cursor: "pointer" },
  none: { textAlign: "center" as any, color: "#ccc", marginTop: "50px" }
};