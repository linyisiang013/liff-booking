"use client";
import { useEffect, useState } from "react";

export default function AdminBookingPage() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [availability, setAvailability] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  // 獲取該日期的預約明細
  const fetchAdminData = async (date: string) => {
    setLoading(true);
    try {
      // 加入 t= 時間戳記防止快取
      const res = await fetch(`/api/availability?date=${date}&t=${Date.now()}`);
      const data = await res.json();
      setAvailability(data);
    } catch (err) {
      console.error("讀取失敗", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData(selectedDate);
  }, [selectedDate]);

  // 執行取消預約
  const handleCancel = async (slotTime: string, customerName: string) => {
    if (!confirm(`確定要取消 ${customerName} 在 ${slotTime} 的預約嗎？`)) return;

    try {
      const res = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: selectedDate, slot_time: slotTime }),
      });

      if (res.ok) {
        alert("已成功取消");
        fetchAdminData(selectedDate); // 重新整理列表
      } else {
        alert("取消失敗");
      }
    } catch (err) {
      alert("系統異常");
    }
  };

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif", backgroundColor: "#FAF9F6", minHeight: "100vh" }}>
      <h2 style={{ color: "#8c7e6d", textAlign: "center" }}>安指 say_nail 管理後台</h2>

      {/* 日期切換 */}
      <div style={{ marginBottom: "20px", backgroundColor: "#fff", padding: "15px", borderRadius: "10px", boxShadow: "0 2px 5px rgba(0,0,0,0.05)" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "bold", color: "#555" }}>檢視預約日期：</label>
        <input 
          type="date" 
          value={selectedDate} 
          onChange={(e) => setSelectedDate(e.target.value)}
          style={{ width: "100%", padding: "10px", borderRadius: "5px", border: "1px solid #ddd" }}
        />
      </div>

      {loading ? <p style={{ textAlign: "center" }}>載入中...</p> : (
        <div>
          <h3 style={{ fontSize: "16px", color: "#8c7e6d", borderBottom: "2px solid #8c7e6d", paddingBottom: "5px" }}>
            {selectedDate} 預約名單
          </h3>
          
          {availability?.bookedDetails?.length > 0 ? (
            availability.bookedDetails.map((item: any, idx: number) => (
              <div key={idx} style={s.adminCard}>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: "bold", fontSize: "16px" }}>
                    ⏰ {item.slot_time} 
                    <span style={{ marginLeft: "10px", color: "#333" }}>{item.name}</span>
                  </div>
                  <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                    📞 {item.phone || "未留電話"} | 💅 {item.item || "未填項目"}
                  </div>
                </div>

                <button 
                  onClick={() => handleCancel(item.slot_time, item.name)}
                  style={s.cancelBtn}
                >
                  取消預約
                </button>
              </div>
            ))
          ) : (
            <div style={{ textAlign: "center", padding: "40px 0", color: "#aaa" }}>
              ☕ 該日目前尚無預約
            </div>
          )}
        </div>
      )}
    </div>
  );
}

const s = {
  adminCard: {
    display: "flex",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: "15px",
    borderRadius: "12px",
    marginBottom: "10px",
    boxShadow: "0 2px 8px rgba(0,0,0,0.04)",
    borderLeft: "5px solid #8c7e6d"
  },
  cancelBtn: {
    backgroundColor: "#ff4d4f",
    color: "#fff",
    border: "none",
    padding: "8px 15px",
    borderRadius: "6px",
    fontSize: "13px",
    cursor: "pointer",
    fontWeight: "bold" as any,
    transition: "0.2s"
  }
};