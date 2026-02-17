"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";

export default function LiffBookingPage() {
  const [formData, setFormData] = useState({ 
    name: "", 
    phone: "不需卸甲", 
    date: "", 
    slot_time: "", 
    item: "" 
  });
  
  const [userId, setUserId] = useState("");
  const [availabilityData, setAvailabilityData] = useState<{allSlots: string[], allDisabled: string[]}>({ allSlots: [], allDisabled: [] }); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 今天日期相關判斷 (用於 17 號限制)
  const today = new Date();
  const isAfter17th = today.getDate() >= 17;

  useEffect(() => {
    const initLiff = async () => {
      try {
        await liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! });
        if (!liff.isLoggedIn()) {
          liff.login();
        } else {
          const profile = await liff.getProfile();
          setUserId(profile.userId);
        }
      } catch (err) { console.error(err); }
      setLoading(false);
    };
    initLiff();
  }, []);

  // 當日期改變時，抓取該日「已預約」與「已排休」的總清單
  useEffect(() => {
    const targetDate = formData.date || new Date().toISOString().split('T')[0];
    if (!formData.date) setFormData(prev => ({ ...prev, date: targetDate }));

    // 呼叫 API，此 API 會同時回傳 bookings 與 closures 的資料
    fetch(`/api/availability?date=${targetDate}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        // 這裡 data.allDisabled 必須包含預約與排休
        setAvailabilityData({
            allSlots: data.allSlots || [],
            allDisabled: data.allDisabled || []
        });
      })
      .catch(err => console.error("讀取時段失敗", err));
  }, [formData.date]);

  const handleDateClick = (day: Date) => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    setFormData({ ...formData, date: dateStr, slot_time: "" });
  };

  // 問題 3：修正下個月按鈕邏輯
  const handleNextMonth = () => {
    const displayMonth = viewDate.getMonth();
    const currentMonth = today.getMonth();

    // 如果目前在當月，且還沒到 17 號，不准點下個月
    if (displayMonth === currentMonth && !isAfter17th) {
      alert("每個月 17 號後才開放下個月預約喔！");
      return;
    }

    // 限制最多只能看到下個月 (不能無限點後面的月份)
    if (displayMonth > currentMonth) {
        return; 
    }

    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1));
  };

  const handlePrevMonth = () => {
    // 限制不能點回過去的月份
    if (viewDate.getMonth() <= today.getMonth() && viewDate.getFullYear() <= today.getFullYear()) return;
    setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1));
  };

  const handleSubmit = async () => {
    if (!userId || !formData.name || !formData.date || !formData.slot_time) return alert("請完整填寫資料");
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
        alert("預約成功！通知已發送。");
        liff.closeWindow();
      } else {
        const err = await res.json();
        alert(err.error || "預約失敗，請檢查該時段是否已被選取");
      }
    } catch (e) { alert("連線失敗"); } finally { setSubmitting(false); }
  };

  // 日曆計算邏輯
  const calendarDays = (() => {
    const days = [];
    const date = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstDayIndex = date.getDay();
    while (date.getMonth() === viewDate.getMonth()) {
      days.push(new Date(date));
      date.setDate(date.getDate() + 1);
    }
    return { days, firstDayIndex };
  })();
  const { days, firstDayIndex } = calendarDays;

  return (
    <div style={s.container}>
      <h2 style={s.headerTitle}>安指 say_nail 預約</h2>

      <div style={s.card}>
        <div style={s.calendarHeader}>
          <button onClick={handlePrevMonth} style={s.navBtn}>上月</button>
          <b style={{fontSize:'16px', color:'#333'}}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</b>
          {/* 問題 3 的按鈕外觀控制 */}
          <button 
            onClick={handleNextMonth} 
            style={{...s.navBtn, opacity: (!isAfter17th && viewDate.getMonth() === today.getMonth()) ? 0.3 : 1}}
          >
            下月
          </button>
        </div>
        <div style={s.calendarGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekLabel}>{d}</div>)}
          {Array(firstDayIndex).fill(null).map((_, i) => <div key={`empty-${i}`}></div>)}
          {days.map(day => {
            const ds = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
            const isSelected = formData.date === ds;
            return (
              <div key={ds} onClick={() => handleDateClick(day)} 
                style={{ ...s.dayCell, backgroundColor: isSelected ? "#8c7e6d" : "transparent", color: isSelected ? "#fff" : "#5a544e" }}>
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </div>

      {/* 問題 1 的時段變灰邏輯 */}
      <div style={s.card}>
        <div style={s.slotGrid}>
          {availabilityData.allSlots.map(t => {
            const isDisabled = availabilityData.allDisabled.includes(t.trim());
            const isSelected = formData.slot_time === t;
            return (
              <button 
                key={t} 
                disabled={isDisabled} 
                onClick={() => setFormData({ ...formData, slot_time: t })}
                style={{ 
                  ...s.slotBtn, 
                  backgroundColor: isDisabled ? "#f0f0f0" : (isSelected ? "#fff" : "#fff"), 
                  borderColor: isDisabled ? "#eee" : (isSelected ? "#8c7e6d" : "#eee"),
                  borderWidth: isSelected ? "2px" : "1px",
                  color: isDisabled ? "#ccc" : (isSelected ? "#8c7e6d" : "#5a544e"),
                }}>
                {t} {isDisabled && <span style={{fontSize:'10px'}}>(滿)</span>}
              </button>
            );
          })}
        </div>
      </div>

      <div style={s.card}>
        <input type="text" placeholder="您的姓名" style={s.input} value={formData.name} onChange={(e) => setFormData({ ...formData, name: e.target.value })} />
        <div style={{ display: "flex", gap: "10px", margin: "15px 0" }}>
          <button onClick={() => setFormData({ ...formData, phone: "需卸甲" })} 
            style={{ ...s.choiceBtn, borderColor: formData.phone === "需卸甲" ? "#8c7e6d" : "#ddd", color: formData.phone === "需卸甲" ? "#8c7e6d" : "#666" }}>需卸甲</button>
          <button onClick={() => setFormData({ ...formData, phone: "不需卸甲" })} 
            style={{ ...s.choiceBtn, borderColor: formData.phone === "不需卸甲" ? "#8c7e6d" : "#ddd", color: formData.phone === "不需卸甲" ? "#8c7e6d" : "#666" }}>不需卸甲</button>
        </div>
        <input type="text" placeholder="施作項目" style={s.input} value={formData.item} onChange={(e) => setFormData({ ...formData, item: e.target.value })} />
      </div>

      <button onClick={handleSubmit} disabled={submitting} style={{ ...s.submitBtn, backgroundColor: submitting ? "#ccc" : "#8c7e6d" }}>
        {submitting ? "處理中..." : "確認預約"}
      </button>
      <div style={{height: "50px"}}></div>
    </div>
  );
}

const s: Record<string, any> = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  headerTitle: { textAlign: "center", color: "#A89A8E", marginBottom: "20px", fontSize: "20px" },
  card: { marginBottom: "15px", backgroundColor: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  navBtn: { border: "1px solid #ddd", background: "#fff", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", color: "#666" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", rowGap: "8px" },
  weekLabel: { fontSize: "12px", color: "#999", marginBottom: "5px" },
  dayCell: { padding: "8px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px", transition: "0.2s" },
  slotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  slotBtn: { padding: "15px 0", borderRadius: "10px", borderStyle: "solid", fontWeight: "bold", fontSize: "14px", transition: "all 0.2s" },
  input: { width: "100%", padding: "14px", borderRadius: "8px", border: "1px solid #f0f0f0", boxSizing: "border-box", fontSize: "14px", backgroundColor: "#fcfcfc", outline: "none" },
  choiceBtn: { flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid", backgroundColor: "#fff", cursor: "pointer", fontWeight: "bold", fontSize: "14px" },
  submitBtn: { width: "100%", padding: "16px", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "16px", cursor: "pointer" }
};