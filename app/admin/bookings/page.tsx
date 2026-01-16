"use client";
import { useEffect, useState } from "react";

const TIMES = ["09:40", "13:00", "16:00", "19:20"];

export default function AdminBookings() {
  // --- 原本的狀態 (保持不動) ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date());
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  // --- 新增：存放所有預約資料的狀態 ---
  const [allBookings, setAllBookings] = useState<any[]>([]);

  // 1. 原本的：載入單日資料
  const load = async (dateStr: string) => {
    setLoading(true);
    const res = await fetch(`/api/availability?date=${dateStr}&t=${Date.now()}`);
    const result = await res.json();
    setData(result.bookedDetails || []);
    setLoading(false);
  };

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  // 2. 新增：載入所有預約 (只執行一次)
  useEffect(() => {
    const fetchAll = async () => {
      try {
        // 呼叫 API 抓取全部資料
        const res = await fetch("/api/bookings?all=true");
        if (res.ok) {
          let list = await res.json();
          // 若回傳結構是 { data: [...] } 則取 data
          if (!Array.isArray(list) && list.data) list = list.data;
          
          if (Array.isArray(list)) {
            // 排序：由近到遠 (日期小的在上面)
            list.sort((a: any, b: any) => {
              const t1 = new Date(`${a.date}T${a.slot_time}`).getTime();
              const t2 = new Date(`${b.date}T${b.slot_time}`).getTime();
              return t1 - t2;
            });
            setAllBookings(list);
          }
        }
      } catch (e) {
        console.error("無法載入所有預約", e);
      }
    };
    fetchAll();
  }, [loading]); // 當 loading 變化(例如刪除後)也重新抓取一次

  // 3. 原本的：取消預約
  const handleCancel = async (time: string, name: string) => {
    if (!confirm(`確定取消 ${name} 的預約？`)) return;
    await fetch("/api/bookings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, slot_time: time, type: 'booking' }),
    });
    load(selectedDate); // 重刷單日
    setLoading(true);   // 觸發重刷底部列表
  };

  // 原本的日曆計算 (保持不動)
  const days = [];
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= lastDate; i++) days.push(i);

  return (
    <div style={s.container}>
      <button onClick={() => window.location.href='/admin'} style={s.backBtn}>⬅ 回管理中心</button>
      <h2 style={s.title}>📋 客戶預約清單</h2>

      {/* --- 上半部：原本的日曆 (保持不動) --- */}
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

      {/* --- 下半部：新增的「未來預約總覽」滾輪清單 --- */}
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
                {/* 1. 姓名 */}
                <div style={{ fontSize: "18px", fontWeight: "bold", color: "#5a544e", marginBottom: "5px" }}>
                  {b.customer_name || b.name}
                </div>
                
                {/* 2. 日期與時間 */}
                <div style={{ fontSize: "14px", color: "#d97706", fontWeight: "bold", marginBottom: "5px" }}>
                  {b.date} &nbsp; {b.slot_time.substring(0, 5)}
                </div>
                
                {/* 3. 項目 */}
                <div style={{ fontSize: "15px", color: "#333", marginBottom: "5px" }}>
                  {b.item || "無填寫項目"}
                </div>
                
                {/* 4. 卸甲/電話 (顯示灰色小字) */}
                <div style={{ fontSize: "13px", color: "#888" }}>
                  備註/卸甲：{b.customer_phone || b.phone || "無"}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

    </div>
  );
}

// 樣式表 (保留原本樣式，新增 scrollContainer 與 listCard)
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
    maxHeight: "400px",    // 設定固定高度
    overflowY: "auto",     // 超出時顯示滾輪
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "15px"
  },
  listCard: {
    backgroundColor: "#F5F5F5", // 淺灰底色
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "12px",
    borderLeft: "5px solid #8c7e6d", // 左邊加一條深色增加識別度
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)"
  }
};