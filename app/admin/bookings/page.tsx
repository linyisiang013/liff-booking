"use client";
import { useEffect, useState } from "react";

export default function AdminBookingsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]); // 存放所有預約
  const [loading, setLoading] = useState(true);

  // 初始化：載入所有預約資料
  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      // 呼叫 API 抓取所有預約 (假設後端 /api/bookings 若不帶參數會回傳全部，或需自行調整 API)
      const res = await fetch("/api/bookings?all=true");
      if (res.ok) {
        const data = await res.json();
        // 依照日期 + 時間排序 (由近到遠)
        const sorted = data.sort((a: any, b: any) => {
          const t1 = new Date(`${a.date}T${a.slot_time}`).getTime();
          const t2 = new Date(`${b.date}T${b.slot_time}`).getTime();
          return t1 - t2;
        });
        setBookings(sorted);
      }
    } catch (e) {
      console.error("無法載入預約", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("確定要取消此預約嗎？")) return;
    await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
    fetchBookings(); // 重新整理
  };

  // --- 日曆相關邏輯 ---
  const getDaysInMonth = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const days = [];
    
    // 補前面的空白日
    for (let i = 0; i < firstDay.getDay(); i++) {
      days.push(null);
    }
    
    // 當月日期
    const lastDay = new Date(year, month + 1, 0);
    for (let i = 1; i <= lastDay.getDate(); i++) {
      days.push(new Date(year, month, i));
    }
    return days;
  };

  const calendarDays = getDaysInMonth(selectedDate);
  const dateStr = selectedDate.toISOString().split('T')[0];
  
  // 篩選出「選中日期」的預約 (用於上方顯示)
  const selectedDayBookings = bookings.filter(b => b.date === dateStr);

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif", color: "#5a544e" }}>
      
      {/* 頂部導航 */}
      <button style={s.backBtn} onClick={() => window.location.href = "/admin"}>
        ⬅ 回管理中心
      </button>

      <h2 style={{ textAlign: "center", marginBottom: "20px", fontWeight: "bold" }}>📋 客戶預約清單</h2>

      {/* --- 區塊 1：日曆 --- */}
      <div style={s.card}>
        <div style={s.calendarHeader}>
          <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))} style={s.navBtn}>◀</button>
          <span style={{ fontWeight: "bold", fontSize: "18px" }}>{selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月</span>
          <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))} style={s.navBtn}>▶</button>
        </div>
        
        <div style={s.calendarGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekLabel}>{d}</div>)}
          {calendarDays.map((day, idx) => {
            if (!day) return <div key={idx}></div>;
            const dStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
            const isSelected = dStr === dateStr;
            // 檢查當天是否有預約 (顯示小紅點或標記)
            const hasBooking = bookings.some(b => b.date === dStr);

            return (
              <div 
                key={idx} 
                onClick={() => setSelectedDate(day)}
                style={{
                  ...s.dayCell,
                  backgroundColor: isSelected ? "#8c7e6d" : (hasBooking ? "#fdfbf7" : "transparent"),
                  color: isSelected ? "#fff" : (hasBooking ? "#d97706" : "#333"),
                  fontWeight: (isSelected || hasBooking) ? "bold" : "normal",
                  border: hasBooking && !isSelected ? "1px solid #eee" : "none"
                }}
              >
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- 區塊 2：選中日期的詳細資料 --- */}
      <div style={{ margin: "20px 0" }}>
        <h3 style={{ fontSize: "16px", borderBottom: "2px solid #8c7e6d", paddingBottom: "8px", marginBottom: "15px" }}>
          {dateStr} 預約明細
        </h3>
        
        {selectedDayBookings.length === 0 ? (
          <div style={{ textAlign: "center", color: "#ccc", padding: "20px" }}>今日無預約</div>
        ) : (
          selectedDayBookings.map(b => (
            <div key={b.id} style={s.bookingCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#333" }}>
                  ⏰ {b.slot_time.substring(0, 5)} | {b.customer_name}
                </div>
                <button onClick={() => handleCancel(b.id)} style={s.cancelBtn}>取消預約</button>
              </div>
              <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
                <div>📞 卸甲/電話：{b.customer_phone}</div>
                <div>💅 項目：{b.item}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- 區塊 3 (新增)：所有預約滾輪清單 --- */}
      <div style={{ marginTop: "40px" }}>
        <h3 style={{ fontSize: "16px", backgroundColor: "#f3f3f3", padding: "10px", borderRadius: "8px 8px 0 0", marginBottom: "0", border: "1px solid #e0e0e0" }}>
          📅 未來預約總覽 (由近到遠)
        </h3>
        
        <div style={s.scrollContainer}>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center" }}>載入中...</div>
          ) : bookings.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>目前沒有任何預約</div>
          ) : (
            bookings.map((b) => (
              <div key={`list-${b.id}`} style={s.listCard}>
                {/* 姓名 */}
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#5a544e", marginBottom: "5px" }}>
                  {b.customer_name}
                </div>
                
                {/* 日期時間 */}
                <div style={{ fontSize: "14px", color: "#888", marginBottom: "5px" }}>
                  {b.date} &nbsp; {b.slot_time.substring(0, 5)}
                </div>
                
                {/* 項目 */}
                <div style={{ fontSize: "15px", color: "#444", marginBottom: "5px" }}>
                  {b.item || "無填寫項目"}
                </div>
                
                {/* 電話/卸甲 與 LINE */}
                <div style={{ fontSize: "13px", color: "#999" }}>
                  電話/卸甲: {b.customer_phone}<br/>
                  {/* 若您的資料庫有存 line_user_id 或 line_display_name，可顯示在此 */}
                  {/* LINE: {b.line_user_id} */}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

// 樣式表
const s: Record<string, any> = {
  backBtn: { padding: "8px 12px", borderRadius: "5px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", marginBottom: "10px" },
  card: { backgroundColor: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  navBtn: { border: "none", background: "transparent", fontSize: "18px", cursor: "pointer", padding: "0 10px" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" },
  weekLabel: { fontSize: "13px", color: "#999", paddingBottom: "10px" },
  dayCell: { padding: "10px", borderRadius: "50%", width: "35px", height: "35px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto", cursor: "pointer", fontSize: "14px" },
  bookingCard: { backgroundColor: "#FFF8F0", padding: "15px", borderRadius: "10px", marginBottom: "10px", border: "1px solid #F5E6D3" },
  cancelBtn: { backgroundColor: "#ff4d4f", color: "#fff", border: "none", padding: "5px 10px", borderRadius: "5px", cursor: "pointer", fontSize: "12px" },
  
  // 新增：滾輪清單樣式
  scrollContainer: {
    maxHeight: "400px", // 設定高度限制
    overflowY: "auto",  // 超出高度時顯示捲軸
    backgroundColor: "#fff",
    border: "1px solid #e0e0e0",
    borderTop: "none",
    borderRadius: "0 0 8px 8px",
    padding: "10px"
  },
  listCard: {
    backgroundColor: "#F5F5F5", // 對應圖片的淺灰色背景
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "10px",
    borderLeft: "5px solid #8c7e6d" // 左側加個顏色條增加識別度
  }
};