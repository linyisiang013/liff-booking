"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";

export default function LiffBookingPage() {
  // 表單資料狀態
  const [formData, setFormData] = useState({ 
    name: "", 
    phone: "不需卸甲", 
    date: "", 
    slot_time: "", 
    item: "" 
  });
  
  const [userId, setUserId] = useState("");
  // availabilityData 儲存從後端抓來的「該日所有時段」與「該日不可用時段」
  const [availabilityData, setAvailabilityData] = useState<{allSlots: string[], allDisabled: string[]}>({ allSlots: [], allDisabled: [] }); 
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  
  // 日曆視圖控制
  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 1. 初始化 LIFF
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

  // 2. 當日期改變時，去後端查詢該日期的「時段狀態」
  useEffect(() => {
    // 如果還沒選日期，預設為今天
    const targetDate = formData.date || new Date().toISOString().split('T')[0];
    
    // 確保表單日期同步
    if (!formData.date) setFormData(prev => ({ ...prev, date: targetDate }));

    // 呼叫 API (加上時間戳記防止快取)
    fetch(`/api/availability?date=${targetDate}&t=${Date.now()}`)
      .then(res => res.json())
      .then(data => {
        // data 結構應為: { allSlots: ["09:40",...], allDisabled: ["13:00",...] }
        setAvailabilityData(data);
      })
      .catch(err => console.error("讀取時段失敗", err));
  }, [formData.date]);

  // 處理日期點擊
  const handleDateClick = (day: Date) => {
    const dateStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
    // 切換日期時，清空已選時段，重新觸發 useEffect 抓取新時段
    setFormData({ ...formData, date: dateStr, slot_time: "" });
  };

  // 送出預約
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
          customer_phone: formData.phone, // 這裡借用 phone 欄位存卸甲需求
          item: formData.item, 
          date: formData.date, 
          slot_time: formData.slot_time 
        }),
      });
      if (res.ok) {
        alert("預約成功！");
        liff.closeWindow();
      } else {
        const err = await res.json();
        alert(err.error || "該時段已被搶先預約");
        // 預約失敗重新整理時段
        setFormData(prev => ({ ...prev, slot_time: "" }));
      }
    } catch (e) { alert("連線失敗"); } finally { setSubmitting(false); }
  };

  // 日曆計算
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

      {/* 日曆卡片 */}
      <div style={s.card}>
        <div style={s.calendarHeader}>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={s.navBtn}>上月</button>
          <b style={{fontSize:'16px', color:'#333'}}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</b>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={s.navBtn}>下月</button>
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

      {/* 時段選擇區塊 (自動過濾已預約/已排休) */}
      <div style={s.card}>
        <div style={s.slotGrid}>
          {availabilityData.allSlots.length > 0 ? (
            availabilityData.allSlots.map(t => {
              // 關鍵判斷：如果不幸在 disabled 清單中，則鎖定
              const isDisabled = availabilityData.allDisabled.includes(t);
              const isSelected = formData.slot_time === t;
              
              return (
                <button 
                  key={t} 
                  disabled={isDisabled} 
                  onClick={() => setFormData({ ...formData, slot_time: t })}
                  style={{ 
                    ...s.slotBtn, 
                    // 樣式邏輯：被鎖定(灰底灰字) > 被選中(深色底白字) > 預設(白底黑字)
                    backgroundColor: isDisabled ? "#f5f5f5" : (isSelected ? "#fff" : "#fff"), 
                    borderColor: isDisabled ? "#eee" : (isSelected ? "#8c7e6d" : "#eee"),
                    borderWidth: isSelected ? "2px" : "1px",
                    color: isDisabled ? "#ccc" : (isSelected ? "#8c7e6d" : "#5a544e"),
                    cursor: isDisabled ? "not-allowed" : "pointer"
                  }}>
                  {t} {isDisabled && <span style={{fontSize:'10px'}}>(滿)</span>}
                </button>
              );
            })
          ) : <p style={{ textAlign: "center", gridColumn: "span 2", color: "#999", padding:"10px" }}>本日未開放或已公休</p>}
        </div>
      </div>

      {/* 資料填寫卡片 */}
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
      
      {/* 底部留白 */}
      <div style={{height: "50px"}}></div>
    </div>
  );
}

// 樣式表 (嚴格遵照截圖設計)
const s: Record<string, any> = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  headerTitle: { textAlign: "center", color: "#A89A8E", marginBottom: "20px", fontSize: "20px" },
  
  card: { marginBottom: "15px", backgroundColor: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 2px 8px rgba(0,0,0,0.03)" },
  
  // 日曆
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" },
  navBtn: { border: "1px solid #ddd", background: "#fff", borderRadius: "4px", padding: "4px 10px", fontSize: "12px", cursor: "pointer", color: "#666" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center", rowGap: "8px" },
  weekLabel: { fontSize: "12px", color: "#999", marginBottom: "5px" },
  dayCell: { padding: "8px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px", transition: "0.2s" },

  // 時段按鈕
  slotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" },
  slotBtn: { 
    padding: "15px 0", 
    borderRadius: "10px", 
    borderStyle: "solid", 
    fontWeight: "bold", 
    fontSize: "14px",
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    gap: "5px",
    transition: "all 0.2s"
  },

  // 表單元件
  input: { width: "100%", padding: "14px", borderRadius: "8px", border: "1px solid #f0f0f0", boxSizing: "border-box", fontSize: "14px", backgroundColor: "#fcfcfc", outline: "none" },
  choiceBtn: { flex: 1, padding: "12px", borderRadius: "8px", border: "1px solid", backgroundColor: "#fff", cursor: "pointer", fontWeight: "bold", fontSize: "14px", transition: "0.2s" },
  submitBtn: { width: "100%", padding: "16px", color: "#fff", border: "none", borderRadius: "10px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", boxShadow: "0 4px 10px rgba(140, 126, 109, 0.2)" }
};