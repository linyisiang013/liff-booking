"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();
  const [configs, setConfigs] = useState<any[]>([]);
  const [loadingId, setLoadingId] = useState<number | null>(null);
  const dayNames = ["週日", "週一", "週二", "週三", "週四", "週五", "週六"];

  const loadData = () => {
    fetch('/api/config/slots')
      .then(res => res.json())
      .then(data => setConfigs(data))
      .catch(err => console.error("讀取時段失敗:", err));
  };

  useEffect(() => { loadData(); }, []);

  const handleUpdate = async (day: number, currentVal: string) => {
    setLoadingId(day);
    const slotArray = currentVal.split(',').map(s => s.trim()).filter(s => s);
    
    try {
      const res = await fetch('/api/config/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ day_of_week: day, slots: slotArray })
      });
      
      if (res.ok) {
        alert(`${dayNames[day]} 的時段已成功更新！`);
      } else {
        const errorData = await res.json();
        alert(`更新失敗: ${errorData.error || '未知錯誤'}`);
      }
    } catch (e) {
      alert("連線失敗，請檢查網路或 Vercel 環境變數");
    } finally {
      setLoadingId(null);
    }
  };

  return (
    <div style={s.container}>
      <h2 style={s.title}>安指 say_nail 管理中心</h2>
      
      <div style={s.menuGrid}>
        <div style={s.menuCard} onClick={() => router.push("/admin/bookings")}>
          <div style={s.icon}>📋</div>
          <div style={s.cardTitle}>預約名單管理</div>
          <div style={s.cardDesc}>查看/取消客戶預約</div>
        </div>
        <div style={s.menuCard} onClick={() => router.push("/admin/closures")}>
          <div style={s.icon}>🔒</div>
          <div style={s.cardTitle}>店家排休設定</div>
          <div style={s.cardDesc}>設定公休或手動關卡</div>
        </div>
      </div>

      <div style={s.configCard}>
        <h3 style={s.configTitle}>⚙️ 每週固定時段範本設定</h3>
        <p style={{ fontSize: "12px", color: "#999", marginBottom: "15px" }}>更改後請點擊右側「儲存」按鈕</p>
        
        {configs.length === 0 ? <p style={{textAlign:'center', color:'#ccc'}}>載入中...</p> : 
          configs.map((cfg) => (
            <div key={cfg.day_of_week} style={s.configRow}>
              <span style={s.dayLabel}>{dayNames[cfg.day_of_week]}</span>
              <input 
                id={`input-${cfg.day_of_week}`}
                type="text" 
                defaultValue={cfg.slots.join(', ')} 
                style={s.configInput}
                placeholder="例如: 09:40, 13:00"
              />
              <button 
                onClick={() => {
                  const val = (document.getElementById(`input-${cfg.day_of_week}`) as HTMLInputElement).value;
                  handleUpdate(cfg.day_of_week, val);
                }}
                disabled={loadingId === cfg.day_of_week}
                style={{...s.saveBtn, backgroundColor: loadingId === cfg.day_of_week ? "#ccc" : "#8c7e6d"}}
              >
                {loadingId === cfg.day_of_week ? "..." : "儲存"}
              </button>
            </div>
          ))
        }
      </div>
      <div style={s.footer}>目前模式：進階動態時段系統</div>
    </div>
  );
}

const s = {
  container: { padding: "30px 15px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  title: { color: "#8c7e6d", textAlign: "center" as any, marginBottom: "30px" },
  menuGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "30px" },
  menuCard: { backgroundColor: "#fff", padding: "15px", borderRadius: "12px", boxShadow: "0 2px 8px rgba(0,0,0,0.05)", cursor: "pointer", textAlign: "center" as any },
  icon: { fontSize: "24px", marginBottom: "5px" },
  cardTitle: { fontWeight: "bold" as any, color: "#5a544e", fontSize: "14px" },
  cardDesc: { color: "#A89A8E", fontSize: "11px" },
  configCard: { backgroundColor: "#fff", padding: "20px", borderRadius: "15px", boxShadow: "0 4px 15px rgba(0,0,0,0.05)" },
  configTitle: { color: "#5a544e", fontSize: "16px", marginBottom: "10px", fontWeight: "bold" as any },
  configRow: { display: "flex", alignItems: "center", gap: "8px", marginBottom: "12px" },
  dayLabel: { width: "40px", fontSize: "14px", color: "#8c7e6d", fontWeight: "bold" as any },
  configInput: { flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #eee", fontSize: "14px" },
  saveBtn: { padding: "8px 12px", color: "#fff", border: "none", borderRadius: "8px", cursor: "pointer", fontSize: "12px" },
  footer: { marginTop: "40px", textAlign: "center" as any, color: "#ccc", fontSize: "12px" }
};