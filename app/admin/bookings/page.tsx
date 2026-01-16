"use client";
import { useEffect, useMemo, useState } from "react";

type Booking = {
  date: string;       // YYYY-MM-DD
  slot_time: string;  // HH:mm
  name: string;
  phone?: string;
  item?: string;
};

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

// 使用「本地時間」產生 YYYY-MM-DD（避免 toISOString() 的 UTC 跨日問題）
function getLocalISODate(d = new Date()) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

function compareBooking(a: Booking, b: Booking) {
  // 先比日期，再比時間
  if (a.date !== b.date) return a.date.localeCompare(b.date);
  return a.slot_time.localeCompare(b.slot_time);
}

// 盡可能把後端各種格式統一成 Booking[]
function normalizeBookings(payload: any): Booking[] {
  const raw =
    payload?.bookedDetails ??
    payload?.allBookings ??
    payload?.data ??
    payload ??
    [];

  if (!Array.isArray(raw)) return [];

  return raw
    .map((x: any) => ({
      date: String(x?.date ?? ""),
      slot_time: String(x?.slot_time ?? ""),
      name: String(x?.name ?? ""),
      phone: x?.phone != null ? String(x.phone) : "",
      item: x?.item != null ? String(x.item) : "",
    }))
    .filter((b: Booking) => b.date && b.slot_time && b.name);
}

export default function AdminBookings() {
  // --- 原本狀態（微調：selectedDate 改成本地日期）---
  const [selectedDate, setSelectedDate] = useState(getLocalISODate());
  const [viewDate, setViewDate] = useState(new Date());
  const [data, setData] = useState<Booking[]>([]); // 單日資料
  const [loading, setLoading] = useState(false);

  // --- 新增：所有預約資料 (滾輪清單用) ---
  const [allBookings, setAllBookings] = useState<Booking[]>([]);
  const [allLoading, setAllLoading] = useState(false);

  // 1) 載入單日資料（保留你原本的 API 用法）
  const loadDay = async (dateStr: string) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/availability?date=${dateStr}&t=${Date.now()}`);
      const result = await res.json();
      setData(normalizeBookings(result)); // 仍以 bookedDetails 為主，但能吃其它格式
    } catch (e) {
      console.error("載入失敗", e);
      setData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDay(selectedDate);
  }, [selectedDate]);

  // 2) 載入所有預約（mode=all）
  const fetchAll = async () => {
    setAllLoading(true);
    try {
      const res = await fetch(`/api/availability?mode=all&t=${Date.now()}`);
      const result = await res.json();
      const normalized = normalizeBookings(result);

      // 過濾「今天(含)之後」的預約 + 排序（由近到遠）
      const today = getLocalISODate();
      const upcoming = normalized
        .filter(b => b.date >= today)
        .sort(compareBooking);

      setAllBookings(upcoming);
    } catch (e) {
      console.error("無法載入所有預約", e);
      setAllBookings([]);
    } finally {
      setAllLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  // 3) 取消預約（成功後刷新上面+下面）
  const handleCancel = async (booking: Booking) => {
    if (!confirm(`確定取消 ${booking.name} 的預約？\n${booking.date} ${booking.slot_time}`)) return;

    try {
      const res = await fetch("/api/bookings/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          date: booking.date,
          slot_time: booking.slot_time,
          type: "booking",
        }),
      });

      if (!res.ok) {
        const text = await res.text().catch(() => "");
        alert(`取消失敗：${res.status} ${text}`);
        return;
      }

      // 兩邊都重新整理
      await Promise.all([loadDay(selectedDate), fetchAll()]);
    } catch (e) {
      console.error(e);
      alert("取消失敗：網路或伺服器錯誤");
    }
  };

  // --- 日曆計算（基本維持不變；僅小修：點日期時也更新 selectedDate）---
  const days = useMemo(() => {
    const lastDate = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate();
    return Array.from({ length: lastDate }, (_, i) => i + 1);
  }, [viewDate]);

  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay();

  return (
    <div style={s.container}>
      <button onClick={() => (window.location.href = "/admin")} style={s.backBtn}>
        ⬅ 回管理中心
      </button>

      <h2 style={s.title}>📋 客戶預約清單</h2>

      {/* 日曆 */}
      <div style={s.calendarCard}>
        <div style={s.calHeader}>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))}>◀</button>
          <span>
            {viewDate.getFullYear()}年 {viewDate.getMonth() + 1}月
          </span>
          <button onClick={() => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))}>▶</button>
        </div>

        <div style={s.calGrid}>
          {["日", "一", "二", "三", "四", "五", "六"].map(d => (
            <div key={d} style={s.weekHead}>
              {d}
            </div>
          ))}
          {Array(firstDay)
            .fill(null)
            .map((_, i) => (
              <div key={`empty-${i}`} />
            ))}

          {days.map(d => {
            const dateStr = `${viewDate.getFullYear()}-${pad2(viewDate.getMonth() + 1)}-${pad2(d)}`;
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

      {/* 單日明細 */}
      <h3 style={s.subTitle}>{selectedDate} 預約明細</h3>
      {loading ? (
        <p>載入中...</p>
      ) : data.length > 0 ? (
        data.map((item, i) => (
          <div key={i} style={s.itemCard}>
            <div style={{ flex: 1 }}>
              <div style={s.bold}>⏰ {item.slot_time} | {item.name}</div>
              <div style={s.small}>
                📞 {item.phone || "-"} | 💅 {item.item || "未填寫項目"}
              </div>
            </div>
            <button onClick={() => handleCancel({ ...item, date: selectedDate })} style={s.delBtn}>
              取消預約
            </button>
          </div>
        ))
      ) : (
        <p style={s.none}>今日無預約</p>
      )}

      {/* 下方：滾輪式未來預約總覽 */}
      <div style={s.section}>
        <h3 style={s.sectionTitle}>📅 未來預約總覽（由近到遠）</h3>

        <div style={s.scrollContainer}>
          {allLoading ? (
            <div style={s.centerHint}>載入中...</div>
          ) : allBookings.length === 0 ? (
            <div style={s.centerHint}>目前沒有未來預約（或後端尚未支援 mode=all）</div>
          ) : (
            allBookings.map((b, idx) => (
              <div key={`${b.date}-${b.slot_time}-${idx}`} style={s.listCard}>
                <div style={s.listName}>{b.name}</div>

                <div style={s.listDatetime}>
                  {b.date} &nbsp; {b.slot_time}
                </div>

                <div style={s.listItem}>{b.item || "未填寫項目"}</div>

                <div style={s.listPhone}>電話/卸甲：{b.phone || "-"}</div>

                <div style={{ marginTop: 10 }}>
                  <button onClick={() => handleCancel(b)} style={s.delBtnSmall}>
                    取消預約
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// 樣式（延用你的風格，補齊下半部）
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
  calGrid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", textAlign: "center" },
  weekHead: { fontSize: "12px", color: "#999", marginBottom: "10px" },
  dayCell: { padding: "10px 0", cursor: "pointer", borderRadius: "8px", fontSize: "14px" },
  subTitle: {
    fontSize: "16px",
    color: "#8c7e6d",
    borderBottom: "2px solid #8c7e6d",
    paddingBottom: "5px",
    marginBottom: "15px",
  },
  itemCard: {
    display: "flex",
    padding: "15px",
    backgroundColor: "#fff",
    marginBottom: "10px",
    borderRadius: "10px",
    borderLeft: "5px solid #8c7e6d",
    boxShadow: "0 2px 5px rgba(0,0,0,0.03)",
  },
  bold: { fontWeight: "bold" },
  small: { fontSize: "12px", color: "#666" },
  delBtn: { backgroundColor: "#ff4d4f", color: "#fff", border: "none", padding: "8px", borderRadius: "5px", cursor: "pointer" },
  none: { textAlign: "center", color: "#ccc", marginTop: "20px" },

  section: { marginTop: "40px", borderTop: "2px solid #eee", paddingTop: "20px" },
  sectionTitle: { fontSize: "16px", color: "#5a544e", fontWeight: "bold", marginBottom: "10px" },

  scrollContainer: {
    maxHeight: "400px",
    overflowY: "auto",
    backgroundColor: "#fff",
    border: "1px solid #ddd",
    borderRadius: "10px",
    padding: "15px",
  },
  centerHint: { padding: "20px", textAlign: "center", color: "#999" },

  listCard: {
    backgroundColor: "#F5F5F5",
    padding: "15px",
    borderRadius: "8px",
    marginBottom: "12px",
    borderLeft: "5px solid #8c7e6d",
    boxShadow: "0 1px 3px rgba(0,0,0,0.05)",
  },
  listName: { fontSize: "18px", fontWeight: "bold", color: "#5a544e", marginBottom: "5px" },
  listDatetime: { fontSize: "14px", color: "#d97706", fontWeight: "bold", marginBottom: "5px" },
  listItem: { fontSize: "15px", color: "#333", marginBottom: "5px" },
  listPhone: { fontSize: "13px", color: "#888" },

  delBtnSmall: {
    backgroundColor: "#ff4d4f",
    color: "#fff",
    border: "none",
    padding: "6px 10px",
    borderRadius: "6px",
    cursor: "pointer",
  },
};
