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

  // 當日期改變時，從後端抓取該日期的禁用狀態
  useEffect(() => {
    if (formData.date) {
      fetch(`/api/availability?date=${formData.date}&t=${Date.now()}`)
        .then(res => res.json())
        .then(data => {
          // data.allDisabled 包含已預約 + 手動關閉的時段
          setDisabledSlots(data.allDisabled || []);
        })
        .catch(console.error);
    }
  }, [formData.date]);

  const handleSubmit = async () => {
    if (!formData.name || !formData.date || !formData.slot_time) {
      return alert("請填寫完整預約資訊（日期、時段與姓名）");
    }
    setLoading(true);

    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        // --- 核心功能：LINE 自動回傳訊息 ---
        if (liff.isInClient()) {
          await liff.sendMessages([
            {
              type: "text",
              text: `✅ 預約成功通知\n----------------\n📅 日期：${formData.date}\n⏰ 時段：${formData.slot_time}\n👤 姓名：${formData.name}\n📞 電話：${formData.phone}\n📝 項目：${formData.item}\n\n※ 此為系統自動發送之明細，期待您的光臨！`,
            },
          ]);
        }
        alert("預約成功！訊息已傳送至您的 LINE 聊天室。");
        liff.closeWindow(); 
      } else {
        const err = await res.json();
        alert(`預約失敗：${err.message || "該時段可能剛剛被選走了"}`);
      }
    } catch (e) {
      alert("系統連線異常，請稍後再試");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", backgroundColor: "#fdfaf7", minHeight: "100vh", color: "#5a544e", fontFamily: "sans-serif" }}>
      <h2 style={{ textAlign: "center", color: "#8c7e6d", marginBottom: "25px" }}>安指 say_nail 預約系統</h2>

      {/* STEP 1: 日期 */}
      <div style={s.card}>
        <h3 style={s.stepTitle}>| STEP 1 | 選擇預約日期</h3>
        <input 
          type="date" 
          style={s.input} 
          onChange={(e) => setFormData({ ...formData, date: e.target.value })} 
        />
      </div>

      {/* STEP 2: 時段 (核心邏輯：變灰與禁用) */}
      <div style={s.card}>
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
                  // 如果滿了就灰色，沒滿則根據選中狀態切換顏色
                  backgroundColor: isFull ? "#e0e0e0" : (isSelected ? "#8c7e6d" : "#fff"),
                  color: isFull ? "#999" : (isSelected ? "#fff" : "#5a544e"),
                  cursor: isFull ? "not-allowed" : "pointer",
                  border: isSelected ? "2px solid #8c7e6d" : "1px solid #ddd",
                  opacity: isFull ? 0.7 : 1
                }}
              >
                {t} {isFull ? "(已滿)" : ""}
              </button>
            );
          })}
        </div>
      </div>

      {/* STEP 3: 個人資料 */}
      <div style={s.card}>
        <h3 style={s.stepTitle}>| STEP 3 | 填寫聯繫資料</h3>
        <input 
          type="text" placeholder="您的姓名 (必填)" style={s.input} 
          onChange={(e) => setFormData({ ...formData, name: e.target.value })} 
        />
        <input 
          type="tel" placeholder="聯絡電話" style={{ ...s.input, marginTop: "12px" }} 
          onChange={(e) => setFormData({ ...formData, phone: e.target.value })} 
        />
        <input 
          type="text" placeholder="施作項目 (例：單色美甲、卸甲)" style={{ ...s.input, marginTop: "12px" }} 
          onChange={(e) => setFormData({ ...formData, item: e.target.value })} 
        />
      </div>

      <button 
        onClick={handleSubmit} 
        disabled={loading}
        style={{ ...s.submitBtn, backgroundColor: loading ? "#ccc" : "#8c7e6d" }}
      >
        {loading ? "處理中..." : "確認立即預約"}
      </button>
    </div>
  );
}

const s = {
  card: { marginBottom: "25px", backgroundColor: "#fff", padding: "18px", borderRadius: "15px", boxShadow: "0 4px 12px rgba(0,0,0,0.05)" },
  stepTitle: { fontSize: "15px", color: "#8c7e6d", marginBottom: "15px", fontWeight: "bold", borderLeft: "4px solid #8c7e6d", paddingLeft: "10px" },
  input: { width: "100%", padding: "12px", borderRadius: "10px", border: "1px solid #eee", boxSizing: "border-box" as any, backgroundColor: "#fafafa", fontSize: "14px" },
  slotBtn: { padding: "15px 0", borderRadius: "10px", fontSize: "14px", textAlign: "center" as any, transition: "all 0.2s ease" },
  submitBtn: { width: "100%", padding: "18px", color: "#fff", border: "none", borderRadius: "12px", fontSize: "16px", cursor: "pointer", fontWeight: "bold", boxShadow: "0 4px 10px rgba(140, 126, 109, 0.3)" }
};