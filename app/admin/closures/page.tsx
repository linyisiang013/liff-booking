// 前端切換狀態的核心邏輯
  const toggleSlot = async (time: string, isClosed: boolean) => {
    const actionLabel = isClosed ? "恢復開放" : "設定排休";
    if (!confirm(`確定要將 ${selectedDate} ${time} ${actionLabel} 嗎？`)) return;

    try {
      let res;
      if (isClosed) {
        // 執行 DELETE：將參數放在 URL 後面
        const url = `/api/admin/closures?date=${selectedDate}&slot_time=${encodeURIComponent(time)}`;
        res = await fetch(url, {
          method: "DELETE",
        });
      } else {
        // 執行 POST：將資料放在 body
        res = await fetch("/api/admin/closures", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ date: selectedDate, slot_time: time }),
        });
      }

      const result = await res.json();

      if (res.ok) {
        alert(`${actionLabel}成功！`);
        load(selectedDate); // 重新讀取該日狀態以更新按鈕顏色
      } else {
        alert(`操作失敗: ${result.error || "未知錯誤"}`);
      }
    } catch (err) {
      console.error(err);
      alert("網路連線或系統發生異常");
    }
  };