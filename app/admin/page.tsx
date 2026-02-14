"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [configs, setConfigs] = useState<any[]>([]);
  const dayNames = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

  // 取得初始設定
  useEffect(() => {
    fetch('/api/config/slots').then(res => res.json()).then(setConfigs);
  }, []);

  // 更新時段邏輯
  const handleUpdate = async (day: number, newSlots: string) => {
    const slotArray = newSlots.split(',').map(s => s.trim()).filter(s => s);
    try {
      const res = await fetch('/api/config/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_of_week: day, slots: slotArray })
      });
      if (res.ok) alert(`${dayNames[day]} 設定已更新`);
    } catch (e) {
      alert("更新失敗");
    }
  };

  return (
    <div style={s.container}>
      <h2 style={s.title}>安指 say_nail 管理中心</h2>
      <p style={s.subtitle}>請選擇操作或調整每週時段</p>

      <div style={s.menuGrid}>
        <div style={s.menuCard} onClick={() => router.push("/admin/bookings")}>
          <div style={s.icon}>📋</div>
          <div style={s.cardTitle}>預約名單管理</div>
          <div style={s.cardDesc}>查看客戶預約、取消預約</div>
        </div>

        <div style={s.menuCard} onClick={() => router.push("/admin/closures")}>
          <div style={s.icon}>🔒</div>
          <div style={s.cardTitle}>店家排休設定</div>
          <div style={s.cardDesc}>手動關閉、設定公休日</div>
        </div>
      </div>

      {/* 每週時段設定區塊 */}
      <div style={s.configCard}>
        <h3 style={s.configTitle}>⚙️ 每週固定時段範本</h3>
        <p style={{ fontSize: "12px", color: "#999", marginBottom: "15px" }}>
          格式：09:00, 13:00 (用逗號隔開)
        </p>
        {configs.map((cfg) => (
          <div key={cfg.day_of_week} style={s.configRow}>
            <span style={s.dayLabel}>{dayNames[cfg.day_of_week]}</span>
            <input 
              type="text" 
              defaultValue={cfg.slots.join(', ')} 
              onBlur={(e) => handleUpdate(cfg.day_of_week, e.target.value)}
              style={s.configInput}
              placeholder="未開放"
            />
          </div>
        ))}
      </div>

      <div style={s.footer}>目前登入：管理員模式</div>
    </div>
  );
}

const s = {
  container: { padding: "40px 20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  title: { color: "#8c7e6d", textAlign: "center" as any, marginBottom: "10px" },
  subtitle: { color: "#999", textAlign: "center" as any, marginBottom: "40px", fontSize: "14px" },
  menuGrid: { display: "grid", gap: "20px" },
  menuCard: { backgroundColor: "#fff", padding: "25px 20px", borderRadius: "15px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)", cursor: "pointer", textAlign: "center" as any, border: "1px solid #f0f0f0" },
  icon: { fontSize: "32px", marginBottom: "10px" },
  cardTitle: { fontWeight: "bold" as any, color: "#5a544e", fontSize: "18px", marginBottom: "5px" },
  cardDesc: { color: "#A89A8E", fontSize: "13px" },
  configCard: { backgroundColor: "#fff", padding: "20px", borderRadius: "15px", marginTop: "30px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" },
  configTitle: { color: "#5a544e", fontSize: "16px", marginBottom: "10px" },
  configRow: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "8px" },
  dayLabel: { width: "45px", fontSize: "14px", color: "#8c7e6d", fontWeight: "bold" as any },
  configInput: { flex: 1, padding: "8px", borderRadius: "8px", border: "1px solid #eee", fontSize: "14px", backgroundColor: "#fcfcfc" },
  footer: { marginTop: "50px", textAlign: "center" as any, color: "#ccc", fontSize: "12px" }
};