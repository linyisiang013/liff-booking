"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";

const TIMES = ["09:40", "13:00", "16:00", "19:20"];

export default function LiffBookingPage() {
  const [formData, setFormData] = useState({ name: "", phone: "", date: "", slot_time: "", item: "" });
  const [userId, setUserId] = useState("");
  const [availableSlots, setAvailableSlots] = useState<any[]>([]); // 存放 API 回傳的時段狀態
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [viewDate, setViewDate] = useState(new Date());

  // 1. 初始化 LIFF 並獲取 Profile
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
      } catch (err) {
        console.error("LIFF 初始化失敗", err);
      }
    };
    initLiff();
  }, []);

  // 2. 核心邏輯：根據日期抓取時段可用性
  useEffect(() => {
    // 預設今天
    const initialDate = formData.date || new Date().toISOString().split('T')[0];
    if (!formData.date) setFormData(prev => ({ ...prev, date: initialDate }));

    fetch(`/api/availability?date=${formData.date || initialDate}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        // 這裡對應你舊程式碼的 data.slots 結構
        setAvailableSlots(data.slots || []);
      })
      .catch(err => console.error("獲取時段失敗", err));
  }, [formData.date]);

  // 日曆計算邏輯 (維持不變)
  const getDaysInMonth = (year: number, month: number) => {
    const date = new Date(year, month, 1);
    const days = [];
    while (date.getMonth() === month) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return days;
  };
  const days = getDaysInMonth(viewDate.getFullYear(), viewDate.getMonth());
  const startDay = days[0].getDay();

  const handleDateClick = (day: Date) => {
    const y = day.getFullYear();
    const m = String(day.getMonth() + 1).padStart(2, '0');
    const d = String(day.getDate()).padStart(2, '0');
    setFormData({ ...formData, date: `${y}-${m}-${d}`, slot_time: "" });
  };

  const handleSubmit = async () => {
    if (!userId) return alert("無法讀取 LINE ID");
    if (!formData.name || !formData.date || !formData.slot_time) return alert("請填寫完整資訊");
    setSubmitting(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          line_user_id: userId,
          customer_name: formData.name,
          customer_phone: formData.phone,
          item: formData.item,
          date: formData.date,
          slot_time: formData.slot_time
        }),
      });

      if (res.ok) {
        if (liff.isInClient()) {
          await liff.sendMessages([{
            type: "text",
            text: `✅ 預約成功！\n姓名：${formData.name}\n日期：${formData.date}\n時段：${formData.slot_time}\n項目：${formData.item || "未填"}`
          }]);
        }
        alert("預約成功！");
        liff.closeWindow();
      } else {
        const errData = await res.json();
        alert(errData.error || "預約失敗");
      }
    } catch (e) {
      alert("系統連線異常");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", color: "#A89A8E", marginBottom: "30px", fontWeight: "600" }}>安指 say_nail 預約系統</h2>

      {/* STEP 1 | 選擇日期 (維持圖二框架) */}
      <div style={s.card}>
        <div style={s.stepHeader}><div style={s.stepLine}></div><span style={s.stepTitle}>STEP 1 | 選擇預約日期</span></div>
        <div style={s.calendarHeader}>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={s.navBtn}>上個月</button>
          <div style={s.currentMonth}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</div>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={s.navBtn}>下個月</button>
        </div>
        <div style={s.calendarGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekLabel}>{d}</div>)}
          {Array(startDay).fill(null).map((_, i) => <div key={`empty-${i}`}></div>)}
          {days.map(day => {
            const dateStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
            const isSelected = formData.date === dateStr;
            return (
              <div key={dateStr} onClick={() => handleDateClick(day)}
                style={{ ...s.dayCell, backgroundColor: isSelected ? "#8c7e6d" : "transparent", color: isSelected ? "#fff" : "#5a544e" }}>
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </div>

      {/* STEP 2 | 選擇時段 (核心修正：判定 is_available) */}
      <div style={s.card}>
        <div style={s.stepHeader}><div style={s.stepLine}></div><span style={s.stepTitle}>STEP 2 | 選擇時段</span></div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
          {TIMES.map(t => {
            // 找出 API 回傳中對應此時段的資料
            const slotInfo = availableSlots.find(s => s.slot_time === t);
            const isAvailable = slotInfo ? slotInfo.is_available : true; // 若沒資料預設可用
            const isSelected = formData.slot_time === t;

            return (
              <button
                key={t}
                disabled={!isAvailable}
                onClick={() => setFormData({ ...formData, slot_time: t })}
                style={{
                  ...s.slotBtn,
                  backgroundColor: !isAvailable ? "#f0f0f0" : (isSelected ? "#8c7e6d" : "#fff"),
                  color: !isAvailable ? "#ccc" : (isSelected ? "#fff" : "#5a544e"),
                  textDecoration: !isAvailable ? "line-through" : "none",
                  border: isSelected ? "1px solid #8c7e6d" : "1px solid #ddd",
                  cursor: !isAvailable ? "not-allowed" : "pointer"
                }}
              >
                {t} {!isAvailable && "(滿)"}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3 | 填寫資料 */}
      <div style={s.card}>
        <div style={s.stepHeader}><div style={s.stepLine}></div><span style={s.stepTitle}>STEP 3 | 填寫聯繫資料</span></div>
        <input type="text" placeholder="您的姓名 (必填)" style={s.input} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        <input type="tel" placeholder="聯絡電話" style={{ ...s.input, marginTop: "12px" }} onChange={(e) => setFormData({ ...formData, phone: e.target.value })} />
        <input type="text" placeholder="施作項目 (例：單色美甲、卸甲)" style={{ ...s.input, marginTop: "12px" }} onChange={(e) => setFormData({ ...formData, item: e.target.value })} />
      </div>

      <button onClick={handleSubmit} disabled={submitting || loading} style={{ ...s.submitBtn, backgroundColor: (submitting || loading) ? "#ccc" : "#8c7e6d" }}>
        {submitting ? "處理中..." : "確認立即預約"}
      </button>
    </div>
  );
}

const s = {
  card: { marginBottom: "20px", backgroundColor: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" },
  stepHeader: { display: "flex", alignItems: "center", marginBottom: "15px" },
  stepLine: { width: "4px", height: "16px", backgroundColor: "#8c7e6d", marginRight: "8px", borderRadius: "2px" },
  stepTitle: { fontSize: "15px", color: "#5a544e", fontWeight: "bold" as any },
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  navBtn: { padding: "5px 10px", border: "1px solid #eee", borderRadius: "5px", backgroundColor: "#fff", fontSize: "12px" },
  currentMonth: { fontWeight: "bold", fontSize: "16px" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" as any },
  weekLabel: { fontSize: "12px", color: "#999", paddingBottom: "10px" },
  dayCell: { padding: "10px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px" },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #f0f0f0", boxSizing: "border-box" as any, backgroundColor: "#F9F9F9", fontSize: "14px" },
  slotBtn: { padding: "12px 0", borderRadius: "10px", fontSize: "14px" },
  submitBtn: { width: "100%", padding: "16px", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", fontWeight: "bold" as any }
};