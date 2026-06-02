"use client";

import React, { useState } from "react";

interface ExcelUploaderProps {
  onUploadSuccess: () => void;
  backendIp: string;
}

export default function ExcelUploader({
  onUploadSuccess,
  backendIp,
}: ExcelUploaderProps) {
  const [loading, setLoading] = useState<boolean>(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;

    const file = e.target.files[0];
    const formData = new FormData();
    formData.append("file", file);

    setLoading(true);

    try {
      const response = await fetch(
        `https://${backendIp}/api/customers/upload`,
        {
          method: "POST",
          body: formData,
        },
      );

      if (!response.ok) throw new Error("서버 업로드 실패");

      alert("엑셀 명단 싱크가 완료되었습니다!");
      onUploadSuccess();
    } catch (error) {
      alert("파일 업로드 중 오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  };

  const handleClearAll = async () => {
    if (
      !confirm("현재 등록된 모든 고객 동선 데이터를 완전히 초기화하시겠습니까?")
    )
      return;
    try {
      const response = await fetch(`https://${backendIp}/api/customers`, {
        method: "DELETE",
      });
      if (response.ok) {
        alert("모든 데이터가 청소되었습니다.");
        onUploadSuccess();
      }
    } catch (e) {
      alert("초기화 중 오류 발생");
    }
  };

  return (
    <div className="flex flex-col gap-4 p-6 bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-start">
        <div className="flex flex-col gap-1">
          <h3 className="text-lg font-bold text-slate-800">
            고객 명단 엑셀 등록
          </h3>
        </div>
        <button
          onClick={handleClearAll}
          className="text-xs font-semibold text-rose-500 bg-rose-50 px-2.5 py-1.5 rounded-md hover:bg-rose-100 transition"
        >
          🧹 전체 초기화
        </button>
      </div>

      <label className="flex items-center justify-center w-full h-24 border-2 border-dashed border-slate-300 rounded-lg cursor-pointer bg-slate-50 hover:bg-slate-100 transition">
        <div className="flex flex-col items-center gap-2 text-slate-500">
          <span className="text-sm font-medium">
            {loading
              ? "카카오 엔진 좌표 연동 중..."
              : "클릭하여 새 명단 업로드"}
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
