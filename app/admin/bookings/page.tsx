"use client";
import { useEffect, useMemo, useState } from "react";

const TIMES = ["09:40", "13:00", "16:00", "19:20"];

type BookingItem = {
  slot_time: string;
  name: string;
  phone?: string;
  item?: string;
};

function timeToMinutes(t: string) {
  // expected "HH:MM"
  const [hh, mm] = t.split(":").map((x) => Number(x));
  if (Number.isFinite(hh) && Number.isFinite(mm)) return hh * 60 + mm;
  return Number.POSITIVE_INFINITY;
}

export default function AdminBookings() {
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [viewDate, setViewDate] = useState(new Date());
  const [data, setData] = useState<BookingItem[]>([]);
  const [loading, setLoading] = useState(false);

  const load = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?date=${dateStr}&t=${Date.now()}`);
      const result = await res.json();
      const list: BookingItem[] = result.bookedDetails || [];
      setData(list);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(selectedDate);
  }, [selectedDate]);

  const sortedData = useMemo(() => {
    // 前端再保險排序一次（就算 API 已排好）
    return [...data].sort((a, b) => {
      // 如果你只允許 TIMES 這四個時段，優先用 TIMES 的順序
      const ia = TIMES.indexOf(a.slot_time);
      const ib = TIMES.indexOf(b.slot_time);
      if (ia !== -1 || ib !== -1) return (ia === -1 ? 999 : ia) - (ib === -1 ? 999 : ib);

      // 否則 fallback 用 HH:MM 解析
      return timeToMinutes(a.slot_time) - timeToMinutes(b.slot_time);
    });
  }, [data]);

  const handleCancel = async (time: string, name: string) => {
    if (!confirm(`確定取消 ${name} 的預約？`)) return;
    await fetch("/api/bookings/delete", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ date: selectedDate, slot_time: time, type: "booking" }),
    });
    load(selectedDate);
  };

  // 日曆邏輯
  const days: number[] = [];
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();
  const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
  for (let i = 1; i <= lastDate; i++) days.push(i);

  return (
    <div style={s.container}>
      <button onClick={() => (window.location.href = "/admin")} style={s.backBtn}>
        ⬅ 回管理中心
      </button>

      <h2 style={s.title}>📋 客戶預約清單</h2>

      {/* 日曆組件 */}
      <div style={s.calendarCard}>
        <div style={s.calHeader}>
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1))}
            style={s.calNavBtn}
            aria-label="previous month"
          >
            ◀
          </button>
          <span>
            {viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月
          </span>
          <button
            onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1))}
            style={s.calNavBtn}
            aria-label="next month"
          >
            ▶
          </button>
        </div>

        <div style={s.calGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map((d) => (
            <div key={d} style={s.weekHead}>
              {d}
            </div>
          ))}
          {Array(firstDay)
            .fill(null)
            .map((_, i) => (
              <div key={`blank-${i}`} />
            ))}

          {days.map((d) => {
            const dateStr = `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(
              2,
              "0"
            )}-${String(d).padStart(2, "0")}`;
            const isSel = selectedDate === dateStr;

            return (
              <div
                key={d}
                onClick={() => setSelectedDate(dateStr)}
                style={{
                  ...s.dayCell,
                  backgroundColor: isSel ? "#8c7e6d" : "transparent",
                  color: isSel ? "#fff" : "#333",
                }}
              >
                {d}
              </div>
            );
          })}
        </div>
      </div>

      <h3 style={s.subTitle}>{selectedDate} 預約明細</h3>

      {/* 滾輪式清單：固定高度 + scroll-snap */}
      <div style={s.wheelWrap}>
        {/* 上下淡出遮罩，營造「滾輪」感 */}
        <div style={s.wheelFadeTop} />
        <div style={s.wheelFadeBottom} />

        {loading ? (
          <div style={s.wheelCenterHint}>載入中...</div>
        ) : sortedData.length > 0 ? (
          <div style={s.wheelList}>
            {sortedData.map((item, i) => (
              <div key={`${item.slot_time}-${item.name}-${i}`} style={s.wheelItem}>
                <div style={{ flex: 1 }}>
                  <div style={s.bold}>⏰ {item.slot_time} | {item.name}</div>
                  <div style={s.small}>
                    📞 {item.phone || "-"} | 💅 {item.item || "-"}
                  </div>
                </div>
                <button onClick={() => handleCancel(item.slot_time, item.name)} style={s.delBtn}>
                  取消預約
                </button>
              </div>
            ))}
          </div>
        ) : (
          <div style={s.wheelCenterHint}>今日無預約</div>
        )}
      </div>
    </div>
  );
}

// 樣式表 (與 LIFF 風格統一)
const s: any = {
  container: {
    padding: "20px",
    maxWidth: "500px",
    margin: "0 auto",
    backgroundColor: "#FAF9F6",
    minHeight: "100vh",
    fontFamily: "sans-serif",
  },
  backBtn: {
    padding: "5px 10px",
    borderRadius: "5px",
    border: "1px solid #ddd",
    cursor: "pointer",
    backgroundColor: "#fff",
    marginBottom: "15px",
  },
  title: { color: "#8c7e6d", textAlign: "center", marginBottom: "20px" },

  calendarCard: {
    backgroundColor: "#fff",
    padding: "15px",
    borderRadius: "15px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    marginBottom: "20px",
  },
  calHeader: { display: "flex", justifyContent: "space-between", marginBottom: "15px", fontWeight: "bold" },
  calNavBtn: { border: "1px solid #eee", background: "#fff", borderRadius: 8, padding: "4px 10px", cursor: "pointer" },
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" },
  weekHead: { fontSize: "12px", color: "#999", marginBottom: "10px" },
  dayCell: { padding: "10px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px" },

  subTitle: {
    fontSize: "16px",
    color: "#8c7e6d",
    borderBottom: "2px solid #8c7e6d",
    paddingBottom: "5px",
    marginBottom: "12px",
  },

  // 滾輪式清單容器
  wheelWrap: {
    position: "relative",
    backgroundColor: "#fff",
    borderRadius: "15px",
    boxShadow: "0 2px 10px rgba(0,0,0,0.05)",
    overflow: "hidden",
    height: 320, // 固定高度：你可依截圖再調整
  },
  wheelList: {
    height: "100%",
    overflowY: "auto",
    padding: "10px 12px",
    scrollSnapType: "y mandatory", // 滾輪感
    WebkitOverflowScrolling: "touch",
  },
  wheelItem: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "14px",
    backgroundColor: "#fff",
    marginBottom: "10px",
    borderRadius: "12px",
    borderLeft: "5px solid #8c7e6d",
    boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
    scrollSnapAlign: "start", // 每個 item 吸附
  },
  wheelCenterHint: {
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#bbb",
  },
  wheelFadeTop: {
    pointerEvents: "none",
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    height: 28,
    background: "linear-gradient(to bottom, rgba(250,249,246,1), rgba(250,249,246,0))",
    zIndex: 2,
  },
  wheelFadeBottom: {
    pointerEvents: "none",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    height: 28,
    background: "linear-gradient(to top, rgba(250,249,246,1), rgba(250,249,246,0))",
    zIndex: 2,
  },

  bold: { fontWeight: "bold" },
  small: { fontSize: "12px", color: "#666" },
  delBtn: { backgroundColor: "#ff4d4f", color: "#fff", border: "none", padding: "8px 10px", borderRadius: "8px", cursor: "pointer" },
};
