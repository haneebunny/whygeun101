"use client";

import React, { useState } from "react";

interface AddCustomerModalProps {
  onSave: (name: string, address: string, phone: string, modelName: string, serviceType: string) => Promise<boolean>;
  onCancel: () => void;
}

export default function AddCustomerModal({ onSave, onCancel }: AddCustomerModalProps) {
  const [name, setName] = useState("");
  const [address, setAddress] = useState("");
  const [phone, setPhone] = useState("");
  const [modelName, setModelName] = useState("");
  const [serviceType, setServiceType] = useState("기본");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !address.trim()) {
      alert("이름과 주소는 필수 입력 사항입니다.");
      return;
    }
    setIsSubmitting(true);
    const success = await onSave(name.trim(), address.trim(), phone.trim(), modelName.trim(), serviceType);
    setIsSubmitting(false);
    if (success) {
      onCancel();
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-5 z-[100] transition-all animate-fadeIn">
      <form
        onSubmit={handleSubmit}
        className="bg-white rounded-3xl p-6 w-full max-w-sm flex flex-col gap-4 border border-slate-100 shadow-2xl"
      >
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5">
          <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-1.5">
            <span>✍️</span> 고객 직접 등록
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 text-sm font-bold w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200/40"
          >
            ✕
          </button>
        </div>

        <div className="flex flex-col gap-3 text-[12.5px]">
          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-700">고객 성함 *</label>
            <input
              type="text"
              required
              placeholder="예: 홍길동"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-700">도로명/지번 주소 *</label>
            <input
              type="text"
              required
              placeholder="좌표 검색을 위해 정확히 입력해주세요."
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-700">연락처</label>
            <input
              type="tel"
              placeholder="예: 010-1234-5678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-700">모델명</label>
            <input
              type="text"
              placeholder="예: A123"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="font-bold text-slate-700">서비스 구분</label>
            <select
              value={serviceType}
              onChange={(e) => setServiceType(e.target.value)}
              className="px-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:border-blue-500 bg-slate-50/50 cursor-pointer"
            >
              <option value="기본">기본</option>
              <option value="라이트">라이트</option>
              <option value="라이트 플러스">라이트 플러스</option>
            </select>
          </div>
        </div>

        <div className="flex gap-2 border-t border-slate-100 pt-3.5 mt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-2xl flex-1 transition text-[13px]"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-2xl flex-1 transition text-[13px] shadow-md shadow-blue-500/10"
          >
            {isSubmitting ? "등록 중..." : "등록 완료"}
          </button>
        </div>
      </form>
    </div>
  );
}
