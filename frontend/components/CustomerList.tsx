/* eslint-disable @typescript-eslint/ban-ts-comment */
"use client";

import React, { useState } from "react";
import { Customer } from "@/types";
// @ts-ignore
import * as Hangul from "hangul-js";

export default function CustomerList({
  customers,
  handleDelete,
}: {
  customers: Customer[];
  handleDelete: (id: number) => void;
}) {
  const [searchTerm, setSearchTerm] = useState("");
  const [searchCategory, setSearchCategory] = useState("all");

  const validCustomers = customers.filter((c) => c.latitude && c.longitude);

  const formatPhoneNumber = (phone: string | null | undefined) => {
    if (!phone) return "";
    const cleaned = ("" + phone).replace(/\D/g, "");
    if (cleaned.length === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    } else if (cleaned.length === 10) {
      if (cleaned.startsWith("02")) {
        return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
      }
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }
    return phone;
  };

  // 💡 카테고리별 필터링 로직 (hangul-js 적용)
  const filteredCustomers = validCustomers.filter((c) => {
    if (!searchTerm) return true;

    // Hangul.search('안희지', '않') -> 일치하면 인덱스(0), 없으면 -1을 반환함!
    const matchName = c.name ? Hangul.search(c.name, searchTerm) !== -1 : false;
    const matchAddress = c.address
      ? Hangul.search(c.address, searchTerm) !== -1
      : false;

    // 전화번호는 숫자니까 하이픈을 빼고 단순 포함 여부만 비교
    const termForPhone = searchTerm.replace(/-/g, "");
    const matchPhone = c.phone
      ? c.phone.replace(/-/g, "").includes(termForPhone)
      : false;

    if (searchCategory === "name") return matchName;
    if (searchCategory === "address") return matchAddress;
    if (searchCategory === "phone") return matchPhone;

    // 전체 검색
    return matchName || matchAddress || matchPhone;
  });

  const handleNaviOpen = (type: "tmap" | "nmap", customer: Customer) => {
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    if (type === "tmap") {
      if (isMobile)
        window.location.href = `tmap://route?goalx=${customer.longitude}&goaly=${customer.latitude}&goalname=${encodeURIComponent(customer.name)}`;
      else
        window.open(
          `https://map.naver.com/v5/?lng=${customer.longitude}&lat=${customer.latitude}&title=${encodeURIComponent(customer.name)}`,
          "_blank",
        );
    } else {
      if (isMobile)
        window.location.href = `nmap://route?dlat=${customer.latitude}&dlng=${customer.longitude}&dname=${encodeURIComponent(customer.name)}`;
      else
        window.open(
          `https://map.naver.com/v5/direction////${customer.longitude},${customer.latitude},${encodeURIComponent(customer.name)}/-/car`,
          "_blank",
        );
    }
  };

  const CATEGORIES = [
    { id: "all", label: "전체" },
    { id: "name", label: "이름" },
    { id: "address", label: "주소" },
    { id: "phone", label: "번호" },
  ];

  return (
    <div className="flex flex-col gap-4 p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#2563eb"
            strokeWidth="2"
            className="bg-blue-50 p-1 rounded-md"
          >
            <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
            <circle cx="9" cy="7" r="4"></circle>
            <path d="M23 21v-2a4 4 0 0 0-3-3.87"></path>
            <path d="M16 3.13a4 4 0 0 1 0 7.75"></path>
          </svg>
          <h3 className="text-base font-bold text-slate-800">
            방문 고객 리스트 ({filteredCustomers.length})
          </h3>
        </div>
      </div>

      <div className="flex flex-col gap-2.5">
        <div className="relative w-full">
          <input
            type="text"
            placeholder={
              searchCategory === "name"
                ? "이름으로 검색..."
                : searchCategory === "address"
                  ? "주소로 검색..."
                  : searchCategory === "phone"
                    ? "전화번호로 검색..."
                    : "이름, 주소, 번호 검색..."
            }
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-2.5 pl-10 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 focus:outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100 transition"
          />
          <svg
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
        </div>

        <div className="flex gap-1.5">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setSearchCategory(cat.id)}
              className={`px-3.5 py-1.5 rounded-lg text-[11px] font-bold transition-all ${
                searchCategory === cat.id
                  ? "bg-slate-800 text-white shadow-sm"
                  : "bg-slate-100 text-slate-500 hover:bg-slate-200"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-3 mt-1">
        {filteredCustomers.length === 0 ? (
          <p className="text-xs text-slate-400 text-center py-6">
            검색 결과가 없습니다.
          </p>
        ) : (
          filteredCustomers.map((customer, index) => (
            <div
              key={customer.id}
              className="flex items-center justify-between p-3.5 bg-white border border-slate-100 rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.02)] hover:shadow-md transition"
            >
              <div
                className="flex items-center gap-3 flex-1 min-w-0 cursor-pointer"
                onClick={() =>
                  (window as any).focusCustomerMarker?.(customer.id)
                }
              >
                <div className="w-7 h-7 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xs font-bold shrink-0">
                  {index + 1}
                </div>
                <div className="flex flex-col gap-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-bold text-sm text-slate-800 truncate">
                      {customer.name}
                    </span>
                    {customer.status && customer.status !== "미컨택" && (
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold ${customer.status === "완료" ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}
                      >
                        {customer.status}
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 truncate">
                    {customer.address}
                  </span>

                  {customer.phone && (
                    <div className="flex items-center gap-1 mt-0.5">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        width="10"
                        height="10"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="2.5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="text-slate-400"
                      >
                        <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                      </svg>
                      <span className="text-[10px] font-medium text-slate-500">
                        {formatPhoneNumber(customer.phone)}
                      </span>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0 pl-2">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNaviOpen("tmap", customer);
                  }}
                  className="w-8 h-8 rounded-full bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 hover:bg-blue-100 transition shadow-sm text-xs font-black"
                  title="티맵"
                >
                  T
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNaviOpen("nmap", customer);
                  }}
                  className="w-8 h-8 rounded-full bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 hover:bg-emerald-100 transition shadow-sm text-xs font-black"
                  title="네이버"
                >
                  N
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(customer.id);
                  }}
                  className="w-8 h-8 rounded-full bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-50 transition shadow-sm"
                  title="삭제"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                  >
                    <line x1="18" y1="6" x2="6" y2="18"></line>
                    <line x1="6" y1="6" x2="18" y2="18"></line>
                  </svg>
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
