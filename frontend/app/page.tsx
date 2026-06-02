"use client";

import React, { useState, useEffect } from "react";
import ExcelUploader from "@/components/ExcelUploader";
import KakaoMap from "@/components/KakaoMap";
import CustomerList from "@/components/CustomerList";
import { Customer, FailedCustomer } from "@/types";

export default function Home() {
  const BACKEND_IP = "sales-map-db.onrender.com";

  const [successCustomers, setSuccessCustomers] = useState<Customer[]>([]);
  const [failedCustomers, setFailedCustomers] = useState<FailedCustomer[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");

  const fetchCustomers = async () => {
    try {
      const response = await fetch(`https://${BACKEND_IP}/api/customers`);
      if (response.ok) {
        const data = await response.json();
        setSuccessCustomers(data.success_list || []);
        setFailedCustomers(data.failed_list || []);
      }
    } catch (error) {
      console.error("고객 리스트 패칭 오류:", error);
    }
  };

  const handleEditSubmit = async (customerId: number) => {
    if (!editText.trim()) return;

    try {
      const response = await fetch(
        `https://${BACKEND_IP}:8000/api/customers/${customerId}`,
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ address: editText }),
        },
      );

      if (response.ok) {
        const resData = await response.json();
        if (resData.success) {
          alert(
            `${resData.customer.name} 님의 좌표가 성공적으로 등록되었습니다!`,
          );
          setEditId(null);
          fetchCustomers(); // 성공/실패 목록 재싱크 및 새로고침 영구 반영
        } else {
          alert(
            "수정된 주소로도 카카오 좌표를 찾지 못했습니다. 주소를 다시 확인해 주세요.",
          );
        }
      }
    } catch (e) {
      alert("주소 수정 처리 중 오류가 발생했습니다.");
    }
  };

  useEffect(() => {
    fetchCustomers();
  }, []);

  return (
    <main className="min-h-screen bg-slate-50 p-6 flex flex-col gap-6 max-w-md mx-auto">
      <header className="flex flex-col gap-1">
        <h1 className="text-2xl font-black text-slate-900 tracking-tight">
          Sales Route Map
        </h1>
        <p className="text-xs text-slate-500">
          영업 동선 효율화를 위한 위치 기반 내비게이션
        </p>
      </header>

      <ExcelUploader onUploadSuccess={fetchCustomers} backendIp={BACKEND_IP} />

      {/* 💡 지속성 확보: 영구 보존된 실패 리스트가 존재할 때만 렌더링 */}
      {failedCustomers.length > 0 && (
        <div className="flex flex-col gap-2 p-4 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-sm shadow-sm">
          <div className="font-bold text-xs">
            ⚠️ 주소 불일치 실패 목록 ({failedCustomers.length}건)
          </div>
          <p className="text-[11px] text-rose-600/80 mb-1">
            새로고침을 해도 보정 전까지 목록이 상시 유지됩니다.
          </p>
          <ul className="flex flex-col gap-2 max-h-48 overflow-y-auto">
            {failedCustomers.map((item) => (
              <li
                key={`persistent-failed-${item.id}`}
                className="text-xs border-b border-rose-100/60 pb-2 flex flex-col gap-1.5"
              >
                <div>
                  <strong>{item.name}</strong> -{" "}
                  <span className="text-slate-600">{item.address}</span>
                </div>

                {editId === item.id ? (
                  <div className="flex gap-1">
                    <input
                      type="text"
                      className="flex-1 px-2 py-1 rounded border border-slate-300 text-slate-800 text-xs focus:outline-none"
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                    />
                    <button
                      onClick={() => handleEditSubmit(item.id)}
                      className="px-2 py-1 bg-emerald-600 text-white font-bold rounded text-xs whitespace-nowrap"
                    >
                      확인
                    </button>
                    <button
                      onClick={() => setEditId(null)}
                      className="px-2 py-1 bg-slate-400 text-white rounded text-xs whitespace-nowrap"
                    >
                      취소
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setEditId(item.id);
                      setEditText(item.address);
                    }}
                    className="self-start text-[10px] font-bold text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200"
                  >
                    ✏️ 이 주소 수동 보정하기
                  </button>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      <KakaoMap customers={successCustomers} />

      <CustomerList customers={successCustomers} />
    </main>
  );
}
