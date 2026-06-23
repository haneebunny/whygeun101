"use client";

import React, { useState } from "react";

interface MemoModalProps {
  initialMemo: string;
  customerName: string;
  onSave: (memo: string) => Promise<boolean>;
  onCancel: () => void;
}

export default function MemoModal({
  initialMemo,
  customerName,
  onSave,
  onCancel,
}: MemoModalProps) {
  const [memo, setMemo] = useState(initialMemo);
  const [isSaving, setIsSaving] = useState(false);

  const handleSave = async () => {
    setIsSaving(true);
    const success = await onSave(memo.trim());
    setIsSaving(false);
    if (success) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-5 z-[100] transition-all animate-fadeIn">
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 border border-slate-100 shadow-2xl">
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-1.5">
            <span>📝</span> {customerName} 메모 사항
          </h3>
          <button
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200/40"
          >
            ✕
          </button>
        </div>

        <textarea
          rows={6}
          placeholder="여기에 고객 관련 특이사항이나 메모를 기록하세요."
          value={memo}
          onChange={(e) => setMemo(e.target.value)}
          className="w-full p-3.5 text-[13px] text-slate-800 border border-slate-200 rounded-2xl bg-slate-50/50 focus:outline-none focus:border-blue-500 resize-none font-medium leading-relaxed"
        />

        <div className="flex gap-2 border-t border-slate-100 pt-3.5 mt-1">
          <button
            onClick={onCancel}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl flex-1 transition text-[13px]"
          >
            취소
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex-1 transition text-[13px] shadow-md shadow-blue-500/10"
          >
            {isSaving ? "저장 중..." : "메모 저장"}
          </button>
        </div>
      </div>
    </div>
  );
}
