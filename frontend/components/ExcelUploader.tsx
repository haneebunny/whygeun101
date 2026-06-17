"use client";

import React, { useState } from "react";

export default function ExcelUploader({
  onUploadSuccess,
  backendIp,
}: {
  onUploadSuccess: () => void;
  backendIp: string;
}) {
  const [loading, setLoading] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const formData = new FormData();
    formData.append("file", e.target.files[0]);
    setLoading(true);

    try {
      const token = localStorage.getItem("token"); // 👈 토큰 꺼내기
      const response = await fetch(`${backendIp}/api/customers/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
      if (!response.ok) throw new Error();
      alert("엑셀 명단 싱크가 완료되었습니다!");
      onUploadSuccess();
    } catch {
      alert("오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (!confirm("초기화하시겠습니까?")) return;
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`${backendIp}/api/customers`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (response.ok) onUploadSuccess();
    } catch {
      alert("오류 발생");
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            className="bg-blue-50 p-1 rounded-md"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <h3 className="text-sm font-bold text-slate-800">엑셀 등록</h3>
        </div>
        <button
          onClick={handleClearAll}
          className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-50 px-2 py-1 rounded border border-slate-200 hover:bg-slate-100 transition"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"></path>
            <polyline points="3 3 3 8 8 8"></polyline>
          </svg>
          초기화
        </button>
      </div>

      <label className="flex items-center justify-center w-full py-4 border-2 border-dashed border-blue-200 rounded-xl cursor-pointer bg-blue-50/30 hover:bg-blue-50 transition gap-3">
        <svg
          width="24"
          height="24"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#60a5fa"
          strokeWidth="2"
          className="bg-white rounded-full shadow-sm p-1"
        >
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="17 8 12 3 7 8"></polyline>
          <line x1="12" y1="3" x2="12" y2="15"></line>
        </svg>
        <div className="flex flex-col">
          <span className="text-sm font-bold text-slate-700">
            {loading ? "연동 중..." : "명단 파일(.xlsx) 선택"}
          </span>
        </div>
        <input
          type="file"
          accept=".xlsx, .xls"
          className="hidden"
          onChange={handleFileUpload}
          disabled={loading}
        />
      </label>
    </div>
  );
}
