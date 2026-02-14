"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";

export default function LiffBookingPage() {
  const [formData, setFormData] = useState({ name: "", phone: "不需卸甲", date: "", slot_time: "", item: "" });
  const [userId, setUserId] = useState("");
  const [availabilityData, setAvailabilityData] = useState<{allSlots: string[], allDisabled: string[]}>({ allSlots: [], allDisabled: [] }); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          const profile = await liff.getProfile();
          setUserId(profile.userId);
          setLoading(false);
        }
      } catch (err) { console.error(err); }
    };
    initLiff();
  }, []);

  useEffect(() => {
    const targetDate = formData.date || new Date().toISOString().split('T')[0];
    if (!formData.date) setFormData(prev => ({ ...prev, date: targetDate }));

    fetch(`/api/availability?date=${targetDate}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => setAvailabilityData(data))
      .catch(err => console.error(err));
  }, [formData.date]);

  const now = new Date();
  const maxDate = new Date(now.getFullYear(), now.getMonth() + 3, 1); 
  const minDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);

  const handleDateClick = (day: Date) => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    setFormData({ ...formData, date: dateStr, slot_time: "" });
  };

  const handleSubmit = async () => {
    if (!userId || !formData.name || !formData.date || !formData.slot_time) return alert("請填妥資料");
    setSubmitting(true);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ line_user_id: userId, customer_name: formData.name, customer_phone: formData.phone, item: formData.item, date: formData.date, slot_time: formData.slot_time }),
      });
      if (res.ok) {
        alert("預約成功！");
        liff.closeWindow();
      } else {
        const err = await res.json();
        alert(err.error || "預約失敗");
      }
    } catch (e) { alert("連線失敗"); } finally { setSubmitting(false); }
  };

  const calendarDays = (() => {
    const days = [];
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    while (date.getMonth() === viewDate.getMonth()) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  })();

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh" }}>
      <h2 style={{ textAlign: "center", color: "#A89A8E" }}>安指 say_nail 預約</h2>

      <div style={s.card}>
        <div style={s.calendarHeader}>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>上月</button>
          <b>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</b>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>下月</button>
        </div>
        <div style={s.calendarGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekLabel}>{d}</div>)}
          {Array(calendarDays[0].getDay()).fill(null).map((_, i) => <div key={i}></div>)}
          {calendarDays.map(day => {
            const ds = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
            return (
              <div key={ds} onClick={() => handleDateClick(day)} style={{ ...s.dayCell, backgroundColor: formData.date === ds ? "#8c7e6d" : "transparent", color: formData.date === ds ? "#fff" : "#5a544e" }}>
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </div>

      <div style={s.card}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {availabilityData.allSlots.length > 0 ? (
            availabilityData.allSlots.map(t => {
              const isFull = availabilityData.allDisabled.includes(t);
              const isSelected = formData.slot_time === t;
              return (
                <button key={t} disabled={isFull} onClick={() => setFormData({ ...formData, slot_time: t })}
                  style={{ ...s.slotBtn, background: isFull ? "#f5f5f5" : (isSelected ? "#8c7e6d" : "#fff"), color: isFull ? "#ccc" : (isSelected ? "#fff" : "#5a544e") }}>
                  {t} {isFull && "(滿)"}
                </button>
              );
            })
          ) : <p style={{ textAlign: "center", gridColumn: "span 2", color: "#999" }}>當日無開放時段</p>}
        </div>
      </div>

      <div style={s.card}>
        <input type="text" placeholder="您的姓名" style={s.input} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        <div style={{ display: "flex", gap: "10px", margin: "15px 0" }}>
          <button onClick={() => setFormData({ ...formData, phone: "需卸甲" })} style={{ ...s.choiceBtn, borderColor: formData.phone === "需卸甲" ? "#8c7e6d" : "#ddd" }}>需卸甲</button>
          <button onClick={() => setFormData({ ...formData, phone: "不需卸甲" })} style={{ ...s.choiceBtn, borderColor: formData.phone === "不需卸甲" ? "#8c7e6d" : "#ddd" }}>不需卸甲</button>
        </div>
        <input type="text" placeholder="施作項目" style={s.input} value={formData.item} onChange={(e) => setFormData({ ...formData, item: e.target.value })} />
      </div>

      <button onClick={handleSubmit} disabled={submitting} style={{ ...s.submitBtn, backgroundColor: submitting ? "#ccc" : "#8c7e6d" }}>確認預約</button>
    </div>
  );
}

const s: Record<string, any> = {
  card: { marginBottom: "20px", backgroundColor: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  calendarHeader: { display: "flex", justifyContent: "space-between", marginBottom: "15px" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" },
  weekLabel: { fontSize: "12px", color: "#999", paddingBottom: "10px" },
  dayCell: { padding: "10px 0", cursor: "pointer", borderRadius: "8px" },
  slotBtn: { padding: "12px 0", borderRadius: "10px", border: "1px solid #eee", fontWeight: "bold" },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #f0f0f0", boxSizing: "border-box" },
  choiceBtn: { flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid", backgroundColor: "#fff" },
  submitBtn: { width: "100%", padding: "16px", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "16px" }
};