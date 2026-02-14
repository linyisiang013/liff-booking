"use client";
import { useState, useEffect } from "react";
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export default function AdminClosures() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [configSlots, setConfigSlots] = useState<string[]>([]); // 當天原本有的時段
  const [closedSlots, setClosedSlots] = useState<string[]>([]); // 已經被排休(關閉)的時段
  const [loading, setLoading] = useState(false);

  const [viewDate, setViewDate] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  // 當日期改變時，執行兩件事：
  // 1. 查這一天是星期幾，去抓原本設定的時段 (time_slots_config)
  // 2. 查這一天有哪些時段已經被「排休」 (closures)
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      const dayOfWeek = new Date(selectedDate).getDay(); // 0=週日, 1=週一...

      try {
        // 1. 抓基本時段設定
        const { data: configData } = await supabase
          .from('time_slots_config')
          .select('slots')
          .eq('day_of_week', dayOfWeek)
          .single();
        
        const slots = configData?.slots || [];
        setConfigSlots(slots);

        // 2. 抓排休紀錄
        const { data: closureData } = await supabase
          .from('closures')
          .select('slot_time')
          .eq('date', selectedDate);
        
        // 整理成陣列，例如 ['13:00', '16:00']
        const closed = closureData?.map((c: any) => c.slot_time) || [];
        setClosedSlots(closed);

      } catch (error) {
        console.error("讀取失敗:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedDate]);

  // 切換排休狀態
  const toggleClosure = async (time: string) => {
    const isClosed = closedSlots.includes(time);

    if (isClosed) {
      // 如果原本是關閉 -> 解除排休 (刪除紀錄)
      const { error } = await supabase
        .from('closures')
        .delete()
        .match({ date: selectedDate, slot_time: time });
      
      if (!error) {
        setClosedSlots(prev => prev.filter(t => t !== time));
      }
    } else {
      // 如果原本是開放 -> 設定排休 (新增紀錄)
      const { error } = await supabase
        .from('closures')
        .insert({ date: selectedDate, slot_time: time });
      
      if (!error) {
        setClosedSlots(prev => [...prev, time]);
      } else {
        alert("設定失敗，請檢查網路");
      }
    }
  };

  // 日曆邏輯
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
      <div style={s.header}>
        <button onClick={() => window.location.href = '/admin'} style={s.backBtn}>⬅ 回管理中心</button>
        <h2 style={s.title}>🔒 店家排休設定</h2>
      </div>

      {/* 日曆區塊 */}
      <div style={s.card}>
        <div style={s.calendarHeader}>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))} style={s.navBtn}>◀</button>
          <b style={{fontSize: "16px"}}>{viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月</b>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))} style={s.navBtn}>▶</button>
        </div>
        
        <div style={s.calendarGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => <div key={d} style={s.weekLabel}>{d}</div>)}
          {Array(firstDayIndex).fill(null).map((_, i) => <div key={`empty-${i}`}></div>)}
          {days.map(day => {
            const ds = `${day.getFullYear()}-${String(day.getMonth()+1).padStart(2,'0')}-${String(day.getDate()).padStart(2,'0')}`;
            const isSelected = selectedDate === ds;
            return (
              <div key={ds} onClick={() => setSelectedDate(ds)} 
                style={{ ...s.dayCell, backgroundColor: isSelected ? "#8c7e6d" : "transparent", color: isSelected ? "#fff" : "#5a544e" }}>
                {day.getDate()}
              </div>
            );
          })}
        </div>
      </div>

      {/* 時段設定區塊 */}
      <div style={{marginTop: "25px"}}>
        <h4 style={s.sectionTitle}>📅 {selectedDate} 時段狀態</h4>
        <p style={{fontSize: "12px", color: "#999", marginBottom: "15px", textAlign: "center"}}>
          點擊時段可切換 <span style={{color:"#52c41a"}}>開放</span> / <span style={{color:"#ff4d4f"}}>排休</span>
        </p>
        
        {loading ? <p style={{textAlign:"center", color:"#ccc"}}>讀取中...</p> : (
          configSlots.length === 0 ? (
            <div style={s.emptyState}>本日設定為「不開放」或無時段資料</div>
          ) : (
            <div style={s.slotGrid}>
              {configSlots.map(time => {
                const isClosed = closedSlots.includes(time);
                return (
                  <button 
                    key={time} 
                    onClick={() => toggleClosure(time)}
                    style={{
                      ...s.slotBtn,
                      backgroundColor: isClosed ? "#fff1f0" : "#f6ffed",
                      borderColor: isClosed ? "#ffccc7" : "#b7eb8f",
                      color: isClosed ? "#ff4d4f" : "#389e0d"
                    }}
                  >
                    <div style={{fontSize: "18px", fontWeight: "bold"}}>{time}</div>
                    <div style={{fontSize: "12px", marginTop: "4px"}}>
                      {isClosed ? "🚫 已排休 (關閉)" : "✅ 開放中"}
                    </div>
                  </button>
                );
              })}
            </div>
          )
        )}
      </div>
    </div>
  );
}

const s = {
  container: { padding: "20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  header: { display: "flex", alignItems: "center", marginBottom: "20px", position: "relative" as any },
  backBtn: { position: "absolute" as any, left: 0, padding: "8px 12px", border: "1px solid #ddd", background: "#fff", borderRadius: "20px", cursor: "pointer", fontSize: "12px", color: "#666" },
  title: { flex: 1, textAlign: "center" as any, color: "#8c7e6d", margin: 0, fontSize: "18px" },
  
  card: { backgroundColor: "#fff", padding: "15px", borderRadius: "15px", boxShadow: "0 2px 10px rgba(0,0,0,0.05)" },
  calendarHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", padding: "0 10px" },
  navBtn: { border: "none", background: "none", fontSize: "18px", cursor: "pointer", color: "#555" },
  calendarGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" as any, gap: "5px" },
  weekLabel: { fontSize: "12px", color: "#999", paddingBottom: "10px" },
  dayCell: { padding: "8px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px", transition: "0.2s" },

  sectionTitle: { color: "#8c7e6d", textAlign: "center" as any, marginBottom: "5px" },
  slotGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px" },
  slotBtn: { 
    padding: "20px", 
    border: "2px solid", 
    borderRadius: "12px", 
    cursor: "pointer", 
    transition: "all 0.2s",
    display: "flex",
    flexDirection: "column" as any,
    alignItems: "center",
    justifyContent: "center"
  },
  emptyState: { textAlign: "center" as any, padding: "30px", backgroundColor: "#fff", borderRadius: "12px", color: "#ccc" }
};