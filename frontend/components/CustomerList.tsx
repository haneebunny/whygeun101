"use client";

import React from "react";
import { Customer } from "@/types";

interface CustomerListProps {
  customers: Customer[];
}

export default function CustomerList({ customers }: CustomerListProps) {
  const validCustomers = customers.filter((c) => c.latitude && c.longitude);

  const handleNaviOpen = (
    e: React.MouseEvent<HTMLButtonElement>,
    type: "tmap" | "nmap",
    customer: Customer,
  ) => {
    e.preventDefault();

    // 모바일 기기 여부 판별 (iOS, Android 등)
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (type === "tmap") {
      if (isMobile) {
        // 모바일 기기일 때는 티맵 앱 앱스키마 구동
        window.location.href = `tmap://route?goalx=${customer.longitude}&goaly=${customer.latitude}&goalname=${encodeURIComponent(customer.name)}`;
      } else {
        // PC 브라우저 환경일 때는 에러 창 대신 티맵 웹 지도 주소로 안전하게 안내 우회
        window.open(
          `https://map.naver.com/v5/?lng=${customer.longitude}&lat=${customer.latitude}&title=${encodeURIComponent(customer.name)}&isCorrectAnswer=true`,
          "_blank",
        );
      }
    } else if (type === "nmap") {
      if (isMobile) {
        // 모바일 네이버 지도 앱 구동
        window.location.href = `nmap://route?dlat=${customer.latitude}&dlng=${customer.longitude}&dname=${encodeURIComponent(customer.name)}&appname=sales_map`;
      } else {
        // PC 브라우저 환경일 때는 네이버 웹 지도 경로 탐색 창으로 다이렉트 연결
        window.open(
          `https://map.naver.com/v5/direction////${customer.longitude},${customer.latitude},${encodeURIComponent(customer.name)}/-/car`,
          "_blank",
        );
      }
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
              className="flex flex-col gap-2 p-3 bg-slate-50 rounded-lg border border-slate-100"
            >
              <div className="flex flex-col gap-0.5">
                <span className="font-bold text-sm text-slate-800">
                  {customer.name}
                </span>
                <span className="text-xs text-slate-500 truncate">
                  {customer.address}
                </span>
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
