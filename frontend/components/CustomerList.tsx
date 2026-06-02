"use client";

import React from "react";
import { Customer } from "@/types";

interface CustomerListProps {
  customers: Customer[];
  handleDelete: (customerId: number) => void;
}

export default function CustomerList({
  customers,
  handleDelete,
}: CustomerListProps) {
  const validCustomers = customers.filter((c) => c.latitude && c.longitude);

  const handleNaviOpen = (
    e: React.MouseEvent<HTMLButtonElement>,
    type: "tmap" | "nmap",
    customer: Customer,
  ) => {
    e.preventDefault();
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (type === "tmap") {
      if (isMobile) {
        window.location.href = `tmap://route?goalx=${customer.longitude}&goaly=${customer.latitude}&goalname=${encodeURIComponent(customer.name)}`;
      } else {
        window.open(
          `https://map.naver.com/v5/?lng=${customer.longitude}&lat=${customer.latitude}&title=${encodeURIComponent(customer.name)}&isCorrectAnswer=true`,
          "_blank",
        );
      }
    } else if (type === "nmap") {
      if (isMobile) {
        window.location.href = `nmap://route?dlat=${customer.latitude}&dlng=${customer.longitude}&dname=${encodeURIComponent(customer.name)}&appname=sales_map`;
      } else {
        window.open(
          `https://map.naver.com/v5/direction////${customer.longitude},${customer.latitude},${encodeURIComponent(customer.name)}/-/car`,
          "_blank",
        );
      }
    }
  };

  // 💡 [핵심 추가] 리스트 아이템 클릭 시 지도 마커 포커싱 핸들러
  const handleItemClick = (id: number) => {
    if ((window as any).focusCustomerMarker) {
      (window as any).focusCustomerMarker(id);
    }
  };

  return (
    <div className="flex flex-col gap-3 p-4 bg-white rounded-xl shadow-sm border border-slate-100">
      <div className="text-sm font-bold text-slate-800">
        방문 고객 리스트 ({validCustomers.length}명)
      </div>

      <div className="flex flex-col gap-2 max-h-80 overflow-y-auto">
        {validCustomers.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-4">
            등록된 정상 좌표 고객이 없습니다.
          </p>
        ) : (
          validCustomers.map((customer) => (
            <div
              key={customer.id}
              className="flex flex-col gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-100/80 hover:bg-slate-100/70 transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                {/* 💡 [수정] 이름과 주소 래퍼 영역을 버튼(div역할)으로 개설하여 클릭 시 지도 동적 이동 트리거 가동 */}
                <div
                  onClick={() => handleItemClick(customer.id)}
                  className="flex flex-col gap-0.5 flex-1 min-w-0 cursor-pointer active:opacity-70"
                  title="지도에서 위치 확인"
                >
                  <span className="font-bold text-sm text-slate-800 truncate">
                    {customer.name}
                  </span>
                  <span className="text-xs text-slate-500 truncate">
                    {customer.address}
                  </span>
                </div>

                <button
                  onClick={() => handleDelete(customer.id)}
                  className="w-6 h-6 flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-all text-sm shrink-0"
                  title="삭제"
                >
                  ✕
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={(e) => handleNaviOpen(e, "tmap", customer)}
                  className="flex-1 text-center bg-blue-500 text-white text-xs py-1.5 rounded font-medium hover:bg-blue-600 transition shadow-sm"
                >
                  🚙 티맵 실행
                </button>
                <button
                  onClick={(e) => handleNaviOpen(e, "nmap", customer)}
                  className="flex-1 text-center bg-emerald-500 text-white text-xs py-1.5 rounded font-medium hover:bg-emerald-600 transition shadow-sm"
                >
                  🟢 네이버 지도
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
