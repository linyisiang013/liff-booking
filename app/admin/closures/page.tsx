"use client";
import { useEffect, useState } from "react";

export default function AdminClosures() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [closedSlots, setClosedSlots] = useState<string[]>([]);

  const load = async () => {
    const res = await fetch(`/api/availability?date=${date}&t=${Date.now()}`);
    const result = await res.json();
    setClosedSlots(result.closedOnly || []);
  };

  useEffect(() => { load(); }, [date]);

  const handleOpen = async (time: string) => {
    if (!confirm(`確定恢復開放 ${time} 時段？`)) return;
    await fetch("/api/bookings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date, slot_time: time, type: 'closure' }),
    });
    load();
  };

  return (
    <div style={s.container}>
      <h2 style={s.title}>🔒 店家排休/關閉管理</h2>
      <input type="date" value={date} onChange={e => setDate(e.target.value)} style={s.input} />
      {closedSlots.length > 0 ? closedSlots.map((slot, i) => (
        <div key={i} style={{ ...s.card, borderLeft: "5px solid #A89A8E" }}>
          <div style={{ flex: 1, fontWeight: "bold" }}>🚫 {slot} (目前不開放)</div>
          <button onClick={() => handleOpen(slot)} style={s.openBtn}>恢復開放</button>
        </div>
      )) : <p style={s.none}>此日期無排休時段</p>}
    </div>
  );
}

const s = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh" },
  title: { color: "#A89A8E", textAlign: "center" as any },
  input: { width: "100%", padding: "10px", marginBottom: "20px", borderRadius: "8px", border: "1px solid #ddd" },
  card: { display: "flex", padding: "15px", backgroundColor: "#fff", marginBottom: "10px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" },
  openBtn: { backgroundColor: "#8c7e6d", color: "#fff", border: "none", padding: "8px", borderRadius: "5px", cursor: "pointer" },
  none: { textAlign: "center" as any, color: "#ccc", marginTop: "50px" }
};