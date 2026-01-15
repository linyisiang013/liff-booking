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
    liff.init({ liffId: process.env.NEXT_PUBLIC_LIFF_ID! }).catch(console.error);
  }, []);

  // 當日期改變時，抓取該日期的禁用時段
  useEffect(() => {
    if (formData.date) {
      fetch(`/api/availability?date=${formData.date}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => setDisabledSlots(data.allDisabled || []))
        .catch(console.error);
    }
  }, [formData.date]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.date || !formData.slot_time) return alert("請填寫完整預約資訊");
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
      alert("系統繁忙中，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", backgroundColor: "#fdfaf7", minHeight: "100vh" }}>
      {/* STEP 1: 日期 */}
      <div style={s.section}>
        <h3 style={s.stepTitle}>| STEP 1 | 選擇日期</h3>
        <input 
          type="date" 
          style={s.input} 
          onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
        />
      </div>

      {/* STEP 2: 時段 (加入禁用邏輯) */}
      <div style={s.section}>
        <h3 style={s.stepTitle}>| STEP 2 | 選擇時段</h3>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
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
                  backgroundColor: isFull ? "#e0e0e0" : (isSelected ? "#8c7e6d" : "#fff"),
                  color: isFull ? "#999" : (isSelected ? "#fff" : "#5a544e"),
                  cursor: isFull ? "not-allowed" : "pointer",
                  border: isSelected ? "2px solid #8c7e6d" : "1px solid #ddd",
                  opacity: isFull ? 0.6 : 1
                }}
              >
                {t} {isFull ? "(已滿)" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3: 資料填寫 */}
      <div style={s.section}>
        <h3 style={s.stepTitle}>| STEP 3 | 填寫資料</h3>
        <input 
          type="text" placeholder="姓名" style={s.input} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
        />
        <input 
          type="tel" placeholder="電話" style={{ ...s.input, marginTop: "10px" }} 
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
        />
        <input 
          type="text" placeholder="項目 (如：單色美甲)" style={{ ...s.input, marginTop: "10px" }} 
          onChange={(e) => setFormData({ ...formData, item: e.target.value })} 
        />
      </div>

      <button 
        onClick={handleSubmit} 
        disabled={loading}
        style={{ ...s.submitBtn, backgroundColor: loading ? "#ccc" : "#8c7e6d" }}
      >
        {loading ? "處理中..." : "立即預約"}
      </button>
    </div>
  );
}

const s = {
  section: { marginBottom: "30px", backgroundColor: "#fff", padding: "15px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)" },
  stepTitle: { fontSize: "16px", color: "#8c7e6d", marginBottom: "15px", fontWeight: "bold" },
  input: { width: "100%", padding: "12px", borderRadius: "8px", border: "1px solid #eee", boxSizing: "border-box" as any, backgroundColor: "#fafafa" },
  slotBtn: { padding: "15px", borderRadius: "8px", fontSize: "14px", textAlign: "center" as any, transition: "0.2s" },
  submitBtn: { width: "100%", padding: "18px", color: "#fff", border: "none", borderRadius: "10px", fontSize: "16px", cursor: "pointer", fontWeight: "bold" }
};