"use client";
import { useRouter } from "next/navigation";

export default function AdminDashboard() {
  const router = useRouter();

  return (
    <div style={s.container}>
      <h2 style={s.title}>安指 say_nail 管理中心</h2>
      <p style={s.subtitle}>請選擇您要執行的操作</p>

      <div style={s.menuGrid}>
        {/* 跳轉至預約管理 */}
        <div style={s.menuCard} onClick={() => router.push("/admin/bookings")}>
          <div style={s.icon}>📋</div>
          <div style={s.cardTitle}>預約名單管理</div>
          <div style={s.cardDesc}>查看客戶預約、取消預約、釋出時段</div>
        </div>

        {/* 跳轉至排休管理 */}
        <div style={s.menuCard} onClick={() => router.push("/admin/closures")}>
          <div style={s.icon}>🔒</div>
          <div style={s.cardTitle}>店家排休設定</div>
          <div style={s.cardDesc}>手動關閉時段、設定公休日、恢復開放</div>
        </div>
      </div>

      <div style={s.footer}>
        目前登入：管理員模式
      </div>
    </div>
  );
}

const s = {
  container: { padding: "40px 20px", maxWidth: "500px", margin: "0 auto", backgroundColor: "#FAF9F6", minHeight: "100vh", fontFamily: "sans-serif" },
  title: { color: "#8c7e6d", textAlign: "center" as any, marginBottom: "10px" },
  subtitle: { color: "#999", textAlign: "center" as any, marginBottom: "40px", fontSize: "14px" },
  menuGrid: { display: "grid", gap: "20px" },
  menuCard: { 
    backgroundColor: "#fff", 
    padding: "25px 20px", 
    borderRadius: "15px", 
    boxShadow: "0 4px 15px rgba(0,0,0,0.05)", 
    cursor: "pointer",
    textAlign: "center" as any,
    transition: "transform 0.2s",
    border: "1px solid #f0f0f0"
  },
  icon: { fontSize: "32px", marginBottom: "10px" },
  cardTitle: { fontWeight: "bold" as any, color: "#5a544e", fontSize: "18px", marginBottom: "5px" },
  cardDesc: { color: "#A89A8E", fontSize: "13px" },
  footer: { marginTop: "50px", textAlign: "center" as any, color: "#ccc", fontSize: "12px" }
};