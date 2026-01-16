import { NextResponse } from "next/server";
import { open } from "sqlite";
import sqlite3 from "sqlite3";

// 資料庫連線 helper (保留您原本的設定)
async function openDb() {
  return open({
    filename: "./mydb.sqlite", // 請確認您的資料庫檔名
    driver: sqlite3.Database,
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get("date");
  const mode = searchParams.get("mode"); // 判斷是否要抓全部

  const db = await openDb();

  // --- 新增這段：如果 mode 是 'all'，就回傳所有未來預約 ---
  if (mode === 'all') {
    // 抓取今天以後的預約，並依照時間排序
    const today = new Date().toISOString().split('T')[0];
    const allBookings = await db.all(
      `SELECT * FROM bookings 
       WHERE booking_date >= ? 
       ORDER BY booking_date ASC, slot_time ASC`,
      [today]
    );
    
    // 為了配合前端，我們統一回傳格式
    return NextResponse.json({ bookedDetails: allBookings.map(b => ({
      name: b.customer_name,
      phone: b.customer_phone,
      item: b.item,
      slot_time: b.slot_time,
      date: b.booking_date
    }))});
  }
  // ---------------------------------------------------

  // --- 原本的邏輯 (查詢單日) ---
  if (!date) {
    return NextResponse.json({ error: "Date is required" }, { status: 400 });
  }

  // 查詢該日期的預約
  const bookings = await db.all(
    "SELECT * FROM bookings WHERE booking_date = ?",
    [date]
  );

  // 整理回傳資料
  const bookedDetails = bookings.map((b) => ({
    name: b.customer_name,
    phone: b.customer_phone,
    item: b.item,
    slot_time: b.slot_time,
  }));

  return NextResponse.json({ bookedDetails });
}