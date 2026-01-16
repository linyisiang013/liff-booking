"use client";
import { useEffect, useState } from "react";

export default function AdminBookings() {
  // --- 原本的狀態 ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date());
  const [data, setData] = useState<any[]>([]); // 這是「單日」的資料
  const [loading, setLoading] = useState(false);

  // --- 新增：存放「所有預約」的狀態 (用於底部清單) ---
  const [allBookings, setAllBookings] = useState<any[]>([]);

  // 1. 原本的載入單日邏輯 (不動)
  const load = async (dateStr: string) => {
    setLoading(true);
    const res = await fetch(`/api/availability?date=${dateStr}&t=${Date.now()}`);
    const result = await res.json();
    setData(result.bookedDetails || []);
    setLoading(false);
  };

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  // 2. 新增：載入「所有預約」邏輯 (只在頁面載入時執行一次)
  useEffect(() => {
    const fetchAll = async () => {
      try {
        // 假設後端 /api/bookings 可以抓全部資料
        const res = await fetch("/api/bookings?all=true");
        if (res.ok) {
          let list = await res.json();
          // 如果回傳格式是 { data: [...] } 則取 data
          if (!Array.isArray(list) && list.data) list = list.data;
          
          if (Array.isArray(list)) {
            // 排序：由早到晚
            list.sort((a: any, b: any) => {
              const t1 = new Date(`${a.date}T${a.slot_time}`).getTime();
              const t2 = new Date(`${b.date}T${b.slot_time}`).getTime();
              return t1 - t2;
            });
            setAllBookings(list);
          }
        }
      } catch (e) {
        console.error("無法載入所有預約清單", e);
      }
    };
    fetchAll();
  }, []);

  // 3. 原本的取消邏輯 (不動)
  const handleCancel = async (time: string, name: string) => {
    if (!confirm(`確定取消 ${name} 的預約？`)) return;
    await fetch("/api/bookings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, slot_time: time, type: 'booking' }),
    });
    load(selectedDate); // 重刷單日
    // 這裡可以選擇是否要重刷底部清單，或是重新整理頁面
  };

  // 原本的日曆計算邏輯 (不動)
  const days = [];
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= lastDate; i++) days.push(i);

  return (
    <div style={s.container}>
      <button onClick={() => window.location.href='/admin'} style={s.backBtn}>⬅ 回管理中心</button>
      <h2 style={s.title}>📋 客戶預約清單</h2>

      {/* --- 上半部：原本的日曆與單日明細 (完全保留) --- */}
      <div style={s.calendarCard}>
        <div style={s.calHeader}>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}>◀</button>
          <span>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</span>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}>▶</button>
        </div>
        <div style={s.calGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekHead}>{d}</div>)}
          {Array(firstDay).fill(null).map((_, i) => <div key={i}></div>)}
          {days.map(d => {
            const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const isSel = selectedDate === dateStr;
            return (
              <div key={d} onClick={() => setSelectedDate(dateStr)} 
                style={{ ...s.dayCell, backgroundColor: isSel ? "#8c7e6d" : "transparent", color: isSel ? "#fff" : "#333" }}>
                {d}
              </div>
            );
          })}
        </div>
      </div>

      <h3 style={s.subTitle}>{selectedDate} 預約明細</h3>
      {loading ? <p>載入中...</p> : (
        data.length > 0 ? data.map((item, i) => (
          <div key={i} style={s.itemCard}>
            <div style={{ flex: 1 }}>
              <div style={s.bold}>⏰ {item.slot_time} | {item.name}</div>
              <div style={s.small}>📞 {item.phone} | 💅 {item.item}</div>
            </div>
            <button onClick={() => handleCancel(item.slot_time, item.name)} style={s.delBtn}>取消預約</button>
          </div>
        )) : <p style={s.none}>今日無預約</p>
      )}

      {/* --- 下半部：新增的「預約總覽」滾輪清單 --- */}
      <div style={{ marginTop: "40px", borderTop: "2px solid #eee", paddingTop: "20px" }}>
        <h3 style={{ fontSize: "16px", color: "#5a544e", fontWeight: "bold", marginBottom: "10px" }}>
          📅 未來預約總覽 (由近到遠)
        </h3>
        
        <div style={s.scrollContainer}>
          {allBookings.length === 0 ? (
            <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>尚無資料或載入中...</div>
          ) : (
            allBookings.map((b, idx) => (
              <div key={idx} style={s.listCard}>
                <div style={{ fontSize: "16px", fontWeight: "bold", color: "#5a544e" }}>
                  {b.customer_name || b.name} 
                </div>
                <div style={{ fontSize: "14px", color: "#d97706", fontWeight: "bold", margin: "4px 0" }}>
                  {b.date} &nbsp; {b.slot_time}
                </div>
                <div style={{ fontSize: "13px", color: "#666" }}>
                  項目：{b.item || "未填"} <br/>
                  備註/卸甲：{b.customer_phone || b.phone}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

// 樣式表 (保留您的樣式，並在最後新增 scrollContainer 與 listCard)
const s: any = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  backBtn: { padding: "5px 10px", borderRadius: "5px", border: "1px solid #ddd", cursor: "pointer", backgroundColor: "#fff", marginBottom: "15px" },
  title: { color: "#8c7e6d", textAlign: "center", marginBottom: "20px" },
  calendarCard: { backgroundColor: "#fff", padding: "15px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)", marginBottom: "20px" },
  calHeader: { display: "flex", justifyContent: "space-between", marginBottom: "15px", fontWeight: "bold" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" },
  weekHead: { fontSize: "12px", color: "#999", marginBottom: "10px" },
  dayCell: { padding: "10px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px" },
  subTitle: { fontSize: "16px", color: "#8c7e6d", borderBottom: "2px solid #8c7e6d", paddingBottom: "5px", marginBottom: "15px" },
  itemCard: { display: "flex", padding: "15px", backgroundColor: "#fff", marginBottom: "10px", borderRadius: "10px", borderLeft: "5px solid #8c7e6d", boxShadow: "0 2px 5px rgba(0,0,0,0.03)" },
  bold: { fontWeight: "bold" },
  small: { fontSize: "12px", color: "#666" },
  delBtn: { backgroundColor: "#ff4d4f", color: "#fff", border: "none", padding: "8px", borderRadius: "5px", cursor: "pointer" },
  none: { textAlign: "center", color: "#ccc", marginTop: "20px" },

  // --- 新增樣式 ---
  scrollContainer: {
    height: "350px",       // 這裡控制高度
    overflowY: "auto",     // 這裡產生滾輪
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "10px"
  },
  listCard: {
    backgroundColor: "#F9F9F9",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "10px",
    borderLeft: "4px solid #ccc"
  }
};