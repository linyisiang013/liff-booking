"use client";
import { useEffect, useState } from "react";

export default function AdminBookingsPage() {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  // 初始化：載入所有預約
  useEffect(() => {
    fetchBookings();
  }, []);

  const fetchBookings = async () => {
    try {
      // 嘗試抓取所有預約
      // 注意：這裡假設您的 API 在沒有參數時會回傳全部，或者支援 ?all=true
      // 如果您的 API 預設只回傳當天，這裡可能需要您去調整後端 (api/bookings/route.ts)
      const res = await fetch("/api/bookings?all=true", { cache: "no-store" });
      
      if (res.ok) {
        let data = await res.json();
        
        // 相容性檢查：有些 API 會回傳 { data: [...] }，有些直接回傳 [...]
        if (!Array.isArray(data) && data.data) {
          data = data.data;
        }

        if (Array.isArray(data)) {
          // 排序：由舊到新 (日期小的在上面)
          const sorted = data.sort((a: any, b: any) => {
            const t1 = new Date(`${a.date}T${a.slot_time}`).getTime();
            const t2 = new Date(`${b.date}T${b.slot_time}`).getTime();
            return t1 - t2;
          });
          setBookings(sorted);
        } else {
          console.error("API 回傳格式不是陣列:", data);
          setBookings([]);
        }
      }
    } catch (e) {
      console.error("無法載入預約", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm("確定要取消此預約嗎？")) return;
    try {
      const res = await fetch(`/api/bookings?id=${id}`, { method: "DELETE" });
      if (res.ok) {
        alert("已取消");
        fetchBookings(); // 重新整理
      } else {
        alert("取消失敗");
      }
    } catch (e) {
      alert("網路錯誤");
    }
  };

  // --- 日曆邏輯 (修正版) ---
  const getCalendarCells = (date: Date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    
    const cells = [];
    
    // 1. 補前面的空白 (星期日=0, 星期一=1...)
    // 為了防止錯位，這裡塞入 null，渲染時會給它固定大小
    for (let i = 0; i < firstDay.getDay(); i++) {
      cells.push(null);
    }
    
    // 2. 塞入當月日期
    for (let i = 1; i <= lastDay.getDate(); i++) {
      cells.push(new Date(year, month, i));
    }

    return cells;
  };

  const calendarCells = getCalendarCells(selectedDate);
  const dateStr = selectedDate.toISOString().split('T')[0];
  const selectedDayBookings = bookings.filter(b => b.date === dateStr);

  return (
    <div style={{ padding: "20px", maxWidth: "600px", margin: "0 auto", fontFamily: "sans-serif", color: "#5a544e", paddingBottom: "100px" }}>
      
      {/* 頂部導航 */}
      <div style={{ marginBottom: "20px" }}>
        <button style={s.backBtn} onClick={() => window.location.href = "/admin"}>
          ⬅ 回管理中心
        </button>
      </div>

      <h2 style={{ textAlign: "center", marginBottom: "20px", fontWeight: "bold" }}>📋 客戶預約清單</h2>

      {/* --- 區塊 1：日曆 --- */}
      <div style={s.card}>
        <div style={s.calendarHeader}>
          <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() - 1, 1))} style={s.navBtn}>◀</button>
          <span style={{ fontWeight: "bold", fontSize: "18px" }}>{selectedDate.getFullYear()}年 {selectedDate.getMonth() + 1}月</span>
          <button onClick={() => setSelectedDate(new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 1))} style={s.navBtn}>▶</button>
        </div>
        
        {/* 日曆網格：確保每一格大小一致 */}
        <div style={s.calendarGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => (
            <div key={d} style={s.weekLabel}>{d}</div>
          ))}
          
          {calendarCells.map((day, idx) => {
            // 處理空白格
            if (!day) {
              return <div key={`empty-${idx}`} style={s.emptyCell}></div>;
            }

            const dStr = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
            const isSelected = dStr === dateStr;
            const hasBooking = bookings.some(b => b.date === dStr);

            return (
              <div 
                key={dStr} 
                onClick={() => setSelectedDate(day)}
                style={{
                  ...s.dayCell,
                  backgroundColor: isSelected ? "#8c7e6d" : (hasBooking ? "#fdfbf7" : "transparent"),
                  color: isSelected ? "#fff" : (hasBooking ? "#d97706" : "#333"),
                  fontWeight: (isSelected || hasBooking) ? "bold" : "normal",
                  border: hasBooking && !isSelected ? "1px solid #eee" : "1px solid transparent",
                  boxShadow: isSelected ? "0 2px 5px rgba(0,0,0,0.2)" : "none"
                }}
              >
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </div>

      {/* --- 區塊 2：單日明細 --- */}
      <div style={{ margin: "25px 0" }}>
        <h3 style={{ fontSize: "16px", borderBottom: "2px solid #8c7e6d", paddingBottom: "8px", marginBottom: "15px" }}>
          {dateStr} 預約明細
        </h3>
        
        {selectedDayBookings.length === 0 ? (
          <div style={{ textAlign: "center", color: "#ccc", padding: "20px", background: "#f9f9f9", borderRadius: "8px" }}>今日無預約</div>
        ) : (
          selectedDayBookings.map(b => (
            <div key={b.id} style={s.bookingCard}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#333" }}>
                  ⏰ {b.slot_time.substring(0, 5)} | {b.customer_name}
                </div>
                <button onClick={() => handleCancel(b.id)} style={s.cancelBtn}>取消</button>
              </div>
              <div style={{ marginTop: "8px", color: "#666", fontSize: "14px" }}>
                <div>📞 卸甲：{b.customer_phone}</div>
                <div>💅 項目：{b.item}</div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* --- 區塊 3：所有預約列表 (滾輪) --- */}
      <div style={{ marginTop: "30px" }}>
        <h3 style={{ fontSize: "16px", backgroundColor: "#eee", padding: "12px", borderRadius: "8px 8px 0 0", marginBottom: "0", border: "1px solid #ddd" }}>
          📅 未來預約總覽
        </h3>
        
        <div style={s.scrollContainer}>
          {loading ? (
            <div style={{ padding: "20px", textAlign: "center" }}>載入中...</div>
          ) : bookings.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>
              目前沒有任何預約紀錄<br/>
              <small>(若確定有資料，請檢查 API 回傳格式)</small>
            </div>
          ) : (
            bookings.map((b) => (
              <div key={`list-${b.id}`} style={s.listCard}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div style={{ fontSize: "18px", fontWeight: "bold", color: "#5a544e" }}>
                    {b.customer_name}
                  </div>
                  <div style={{ fontSize: "14px", color: "#888", fontWeight: "bold" }}>
                    {b.date}
                  </div>
                </div>
                
                <div style={{ fontSize: "14px", color: "#d97706", margin: "5px 0", fontWeight: "500" }}>
                  ⏰ {b.slot_time.substring(0, 5)} 
                  <span style={{ marginLeft: "10px", color: "#333" }}>{b.item || "無項目"}</span>
                </div>
                
                <div style={{ fontSize: "13px", color: "#999" }}>
                  卸甲: {b.customer_phone}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

const s: Record<string, any> = {
  backBtn: { padding: "8px 15px", borderRadius: "5px", border: "1px solid #ddd", background: "#fff", cursor: "pointer", fontSize: "14px" },
  card: { backgroundColor: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  navBtn: { border: "none", background: "transparent", fontSize: "20px", cursor: "pointer", padding: "0 15px", color: "#555" },
  
  // 修正網格：使用固定比例，避免被壓縮
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "5px", textAlign: "center" },
  weekLabel: { fontSize: "13px", color: "#999", paddingBottom: "10px" },
  
  // 核心修正：給定高度與寬度，並設為 Flex 置中，確保點擊範圍準確
  dayCell: { 
    aspectRatio: "1/1", 
    display: "flex", alignItems: "center", justifyContent: "center", 
    borderRadius: "8px", cursor: "pointer", fontSize: "14px", 
    userSelect: "none" // 防止連點選取文字
  },
  // 核心修正：空白格也要佔位，否則網格會亂掉
  emptyCell: { aspectRatio: "1/1", visibility: "hidden" },

  bookingCard: { backgroundColor: "#FFF8F0", padding: "15px", borderRadius: "10px", marginBottom: "10px", border: "1px solid #F5E6D3" },
  cancelBtn: { backgroundColor: "#ff4d4f", color: "#fff", border: "none", padding: "6px 12px", borderRadius: "5px", cursor: "pointer", fontSize: "12px" },
  
  scrollContainer: {
    height: "400px",       // 固定高度
    overflowY: "auto",     // 允許滾動
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderTop: "none",
    borderRadius: "0 0 8px 8px",
    padding: "15px"
  },
  listCard: {
    backgroundColor: "#F9F9F9",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "12px",
    borderLeft: "4px solid #8c7e6d",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  }
};