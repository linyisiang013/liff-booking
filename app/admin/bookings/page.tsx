"use client";
import { useEffect, useState } from "react";

export default function AdminBookings() {
  // --- 狀態管理 ---
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [viewDate, setViewDate] = useState(new Date());
  const [data, setData] = useState<any[]>([]); // 單日資料
  const [loading, setLoading] = useState(false);

  // --- 底部列表專用狀態 ---
  const [allBookings, setAllBookings] = useState<any[]>([]);
  const [listLoading, setListLoading] = useState(false); // 列表讀取中狀態

  // 1. 載入「單日」資料 (點選日曆時觸發)
  const load = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?date=${dateStr}&t=${Date.now()}`);
      const result = await res.json();
      setData(result.bookedDetails || []);
    } catch (e) {
      console.error("載入失敗", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(selectedDate); }, [selectedDate]);

  // 2. 載入「未來總覽」 (使用跟上面一樣的 API，自動掃描未來 60 天)
  const fetchAllScanner = async () => {
    setListLoading(true);
    try {
      const today = new Date();
      const promises = [];
      
      // --- 核心邏輯：我們循環查詢接下來的 60 天 ---
      // 這樣就不用改後端，完全沿用您目前穩定的 API
      for (let i = 0; i < 60; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() + i);
        const dateStr = d.toISOString().split('T')[0];
        
        // 發出請求 (平行處理，速度很快)
        const p = fetch(`/api/availability?date=${dateStr}&t=${Date.now()}`)
          .then(res => res.json())
          .then(resData => {
            // 如果這一天有預約，就把日期塞進去回傳
            const items = resData.bookedDetails || [];
            return items.map((item: any) => ({
              ...item,
              date: dateStr // 補上日期欄位以便列表顯示
            }));
          })
          .catch(() => []); // 忽略錯誤
        
        promises.push(p);
      }

      // 等待 60 個請求都回來
      const results = await Promise.all(promises);
      
      // 把結果攤平變成一個大陣列
      const flatList = results.flat();

      // 排序：日期近 -> 遠
      flatList.sort((a: any, b: any) => {
        const t1 = new Date(`${a.date}T${a.slot_time}`).getTime();
        const t2 = new Date(`${b.date}T${b.slot_time}`).getTime();
        return t1 - t2;
      });

      setAllBookings(flatList);

    } catch (e) {
      console.error("掃描列表失敗", e);
    } finally {
      setListLoading(false);
    }
  };

  // 畫面第一次載入時，執行掃描
  useEffect(() => {
    fetchAllScanner();
  }, []); 

  // 3. 取消預約
  const handleCancel = async (time: string, name: string) => {
    if (!confirm(`確定取消 ${name} 的預約？`)) return;
    
    // 呼叫刪除 API
    await fetch("/api/bookings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, slot_time: time, type: 'booking' }),
    });

    // 刪除後，重新整理上面和下面
    load(selectedDate);
    fetchAllScanner(); 
  };

  // --- 日曆計算 (保持不變) ---
  const days = [];
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= lastDate; i++) days.push(i);

  return (
    <div style={s.container}>
      <button onClick={() => window.location.href='/admin'} style={s.backBtn}>⬅ 回管理中心</button>
      <h2 style={s.title}>📋 客戶預約清單</h2>

      {/* --- 上方：日曆 (不變) --- */}
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

      {/* --- 下方：未來預約總覽 (掃描結果) --- */}
      <div style={{ marginTop: "40px", borderTop: "2px solid #eee", paddingTop: "20px" }}>
        <h3 style={{ fontSize: "16px", color: "#8c7e6d", fontWeight: "bold", marginBottom: "15px" }}>
          📅 未來 60 天預約總覽 (列表)
        </h3>
        
        <div style={s.scrollContainer}>
          {listLoading ? (
             <div style={{ padding: "20px", textAlign: "center", color: "#999" }}>正在掃描所有日期...</div>
          ) : (
            allBookings.length === 0 ? (
              <div style={{ padding: "20px", textAlign: "center", color: "#ccc" }}>目前無未來預約</div>
            ) : (
              allBookings.map((b, idx) => (
                <div key={idx} style={s.listCard}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "5px" }}>
                    <span style={{ fontWeight: "bold", color: "#5a544e", fontSize: "16px" }}>{b.name}</span>
                    <span style={{ color: "#d97706", fontWeight: "bold", fontSize: "14px" }}>
                      {b.date}
                    </span>
                  </div>
                  
                  <div style={{ fontSize: "14px", color: "#333", marginBottom: "5px" }}>
                     ⏰ {b.slot_time} <span style={{color:"#ccc"}}>|</span> {b.item || "未填項目"}
                  </div>
                  
                  <div style={{ fontSize: "12px", color: "#888" }}>
                    備註/電話：{b.phone}
                  </div>
                </div>
              ))
            )
          )}
        </div>
      </div>

    </div>
  );
}

// 樣式表 (與之前相同)
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
  scrollContainer: {
    height: "350px",       
    overflowY: "auto",     
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "15px",
    marginBottom: "50px"
  },
  listCard: {
    backgroundColor: "#F9F9F9",
    padding: "12px",
    borderRadius: "8px",
    marginBottom: "10px",
    borderLeft: "4px solid #ccc",
    boxShadow: "0 1px 2px rgba(0,0,0,0.05)"
  }
};