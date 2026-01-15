"use client";
import { useEffect, useState } from "react";
import liff from "@line/liff";

const TIMES = ["09:40", "13:00", "16:00", "19:20"];

export default function LiffBookingPage() {
  const [formData, setFormData] = useState({ name: "", phone: "", date: "", slot_time: "", item: "" });
  const [disabledSlots, setDisabledSlots] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // 初始化 LIFF
  useEffect(() => {
    const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
    if (liffId) {
      liff.init({ liffId }).catch(console.error);
    }
  }, []);

  // 當日期改變時，抓取該日期的禁用狀態
  useEffect(() => {
    if (formData.date) {
      fetch(`/api/availability?date=${formData.date}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => setDisabledSlots(data.allDisabled || []))
        .catch(console.error);
    }
  }, [formData.date]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.date || !formData.slot_time) {
      return alert("請填寫完整預約資訊");
    }
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        // LINE 自動回傳訊息
        if (liff.isInClient()) {
          await liff.sendMessages([
            {
              type: "text",
              text: `✅ 預約成功通知\n----------------\n📅 日期：${formData.date}\n⏰ 時段：${formData.slot_time}\n👤 姓名：${formData.name}\n📞 電話：${formData.phone}\n📝 項目：${formData.item}\n\n※ 此為系統自動發送之明細。`,
            },
          ]);
        }
        alert("預約成功！訊息已傳送至聊天室。");
        liff.closeWindow(); 
      } else {
        const err = await res.json();
        alert(`預約失敗：${err.message || "時段可能已被選走"}`);
      }
    } catch (e) {
      alert("系統連線異常");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "30px 20px", maxWidth: "600px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", color: "#5a544e", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", color: "#A89A8E", marginBottom: "30px", fontSize: "24px", fontWeight: "600" }}>安指 say_nail 預約系統</h2>

      {/* STEP 1: 選擇日期 */}
      <div style={s.card}>
        <div style={s.stepHeader}>
          <div style={s.stepLine}></div>
          <span style={s.stepTitle}>STEP 1 | 選擇預約日期</span>
        </div>
        <input 
          type="date" 
          style={s.input} 
          onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
        />
      </div>

      {/* STEP 2: 選擇時段 */}
      <div style={s.card}>
        <div style={s.stepHeader}>
          <div style={s.stepLine}></div>
          <span style={s.stepTitle}>STEP 2 | 選擇時段</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          {TIMES.map((t) => {
            const isFull = disabledSlots.includes(t);
            const isSelected = formData.slot_time === t;
            return (
              <button
                key={t}
                disabled={isFull}
                onClick={() => setFormData({ ...formData, slot_time: t })}
                style={{
                  ...s.slotBtn,
                  backgroundColor: isFull ? "#EFEFEF" : (isSelected ? "#8c7e6d" : "#FFFFFF"),
                  color: isFull ? "#BBBBBB" : (isSelected ? "#FFFFFF" : "#5a544e"),
                  border: isFull ? "1px solid #E0E0E0" : (isSelected ? "1px solid #8c7e6d" : "1px solid #D1D1D1"),
                  cursor: isFull ? "not-allowed" : "pointer",
                  textDecoration: isFull ? "line-through" : "none"
                }}
              >
                {t}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3: 填寫資料 */}
      <div style={s.card}>
        <div style={s.stepHeader}>
          <div style={s.stepLine}></div>
          <span style={s.stepTitle}>STEP 3 | 填寫聯繫資料</span>
        </div>
        <input 
          type="text" placeholder="您的姓名 (必填)" style={s.input} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
        />
        <input 
          type="tel" placeholder="聯絡電話" style={{ ...s.input, marginTop: "15px" }} 
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
        />
        <input 
          type="text" placeholder="施作項目 (例：單色美甲、卸甲)" style={{ ...s.input, marginTop: "15px" }} 
          onChange={(e) => setFormData({ ...formData, item: e.target.value })} 
        />
      </div>

      <button 
        onClick={handleSubmit} 
        disabled={loading}
        style={{ ...s.submitBtn, backgroundColor: loading ? "#BDBDBD" : "#8c7e6d" }}
      >
        {loading ? "處理中..." : "確認立即預約"}
      </button>
    </div>
  );
}

const s = {
  card: { marginBottom: "25px", backgroundColor: "#FFFFFF", padding: "25px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.03)" },
  stepHeader: { display: "flex", alignItems: "center", marginBottom: "20px" },
  stepLine: { width: "4px", height: "18px", backgroundColor: "#8c7e6d", marginRight: "10px", borderRadius: "2px" },
  stepTitle: { fontSize: "16px", color: "#5a544e", fontWeight: "bold" },
  input: { width: "100%", padding: "14px", borderRadius: "10px", border: "1px solid #F0F0F0", boxSizing: "border-box" as any, backgroundColor: "#F9F9F9", fontSize: "15px", outline: "none" },
  slotBtn: { padding: "15px 0", borderRadius: "10px", fontSize: "15px", textAlign: "center" as any, transition: "all 0.2s ease" },
  submitBtn: { width: "100%", padding: "18px", color: "#FFFFFF", border: "none", borderRadius: "12px", fontSize: "17px", cursor: "pointer", fontWeight: "bold", marginTop: "10px" }
};