"use client";

import React, { useState, useMemo, useEffect } from "react";
import { Customer } from "../../../domain/entities/types";
import KakaoMap from "../../../../components/KakaoMap";
import { useStatus } from "../../components/StatusContext";
import DateTimePicker from "../../components/DateTimePicker";

import { formatVisitTime } from "../../../../components/utils/mapHtmlTemplates";

interface MapTabProps {
  customers: Customer[];
  backendIp: string;
  onToggleStar: (id: number, favorite: boolean) => void;
  onUpdateVisitTime: (id: number, time: string | null) => void;
  onUpdateStatus: (id: number, status: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function MapTab({
  customers,
  backendIp,
  onToggleStar,
  onUpdateVisitTime,
  onUpdateStatus,
  setActiveTab,
}: MapTabProps) {
  const { getDisplayLabel } = useStatus();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("전체");
  
  // DateTimePicker states
  const [activeDateTimePickerId, setActiveDateTimePickerId] = useState<number | null>(null);
  const [tempTime, setTempTime] = useState<string | null>(null);

  // Viewport/visible bounds customers tracked via KakaoMap callback
  const [visibleCustomerIds, setVisibleCustomerIds] = useState<number[]>([]);
  const [showViewportList, setShowViewportList] = useState(false);

  // Filter customers based on search term and status filter
  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      const matchesSearch =
        c.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (c.phone && c.phone.includes(searchTerm));

      const matchesStatus =
        statusFilter === "전체" ||
        (statusFilter === "미컨택" && (!c.status || c.status === "미컨택")) ||
        c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter]);

  // Derive visible customers currently in the viewport bounds
  const viewportCustomers = useMemo(() => {
    return filteredCustomers.filter((c) => visibleCustomerIds.includes(c.id));
  }, [filteredCustomers, visibleCustomerIds]);

  // Hook into window for star toggle & time edit from maps
  useEffect(() => {
    (window as any).reactToggleFavoriteHook = (id: number, favorite: boolean) => {
      onToggleStar(id, favorite);
    };

    (window as any).reactEditTimeHook = (id: number, currentVal: string) => {
      setTempTime(currentVal || null);
      setActiveDateTimePickerId(id);
    };

    (window as any).reactUpdateStatusHook = (id: number, status: string) => {
      onUpdateStatus(id, status);
    };

    return () => {
      delete (window as any).reactToggleFavoriteHook;
      delete (window as any).reactEditTimeHook;
      delete (window as any).reactUpdateStatusHook;
    };
  }, [onToggleStar, onUpdateStatus]);

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

  const getStatusBadgeStyle = (status: string | undefined) => {
    if (status === "컨택") {
      return "bg-amber-50 text-amber-600 border border-amber-200/50";
    }
    if (status === "완료") {
      return "bg-blue-50 text-blue-600 border border-blue-200/50";
    }
    return "bg-rose-50 text-rose-600 border border-rose-200/50";
  };

  return (
    <div className="w-full h-[calc(100vh-140px)] relative flex flex-col bg-slate-50">
      {/* Search and Filters Header */}
      <div className="w-full bg-white p-4 flex flex-col gap-3 shadow-[0_4px_20px_rgba(0,0,0,0.02)] z-10">
        <div className="flex items-center gap-2 bg-slate-50 border border-slate-200/70 rounded-xl px-3 py-2.5">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#94a3b8"
            strokeWidth="2.2"
          >
            <circle cx="11" cy="11" r="8"></circle>
            <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
          </svg>
          <input
            type="text"
            placeholder="이름 또는 주소 검색"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="flex-1 bg-transparent border-0 outline-none text-[13.5px] text-slate-800 placeholder-slate-400"
          />
        </div>

        {/* Filter chips list */}
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          {["미컨택", "컨택", "완료", "전체"].map((status) => {
            const isSelected = statusFilter === status;
            let activeStyle = "";
            let defaultStyle = "";

            if (status === "미컨택") {
              activeStyle = "bg-rose-50 text-rose-600 border border-rose-200 font-bold";
              defaultStyle = "bg-white text-slate-500 border border-slate-100 hover:bg-rose-50/20";
            } else if (status === "컨택") {
              activeStyle = "bg-amber-50 text-amber-600 border border-amber-200 font-bold";
              defaultStyle = "bg-white text-slate-500 border border-slate-100 hover:bg-amber-50/20";
            } else if (status === "완료") {
              activeStyle = "bg-blue-50 text-blue-600 border border-blue-200 font-bold";
              defaultStyle = "bg-white text-slate-500 border border-slate-100 hover:bg-blue-50/20";
            } else {
              activeStyle = "bg-slate-100 text-slate-700 border border-slate-200 font-bold";
              defaultStyle = "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50";
            }

            return (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-1.5 rounded-full text-[12.5px] transition-all whitespace-nowrap cursor-pointer ${
                  isSelected ? activeStyle : defaultStyle
                }`}
              >
                {status}
              </button>
            );
          })}
        </div>
      </div>

      {/* Map Area */}
      <div className="flex-1 w-full relative overflow-hidden">
        <KakaoMap
          customers={filteredCustomers}
          isFullScreen={true}
          backendIp={backendIp}
          onVisibleCustomersChange={setVisibleCustomerIds}
        />

        {/* 지도 / 리스트 플로팅 토글 */}
        <div className="absolute top-4 right-4 z-10 flex bg-white/90 backdrop-blur-md rounded-xl shadow-md border border-slate-200/50 p-0.5">
          <button
            onClick={() => setShowViewportList(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              !showViewportList
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            🗺️ 지도
          </button>
          <button
            onClick={() => setShowViewportList(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all ${
              showViewportList
                ? "bg-blue-600 text-white"
                : "text-slate-500 hover:text-slate-800"
            }`}
          >
            📋 리스트
          </button>
        </div>

        {/* Viewport Bound Customers Overlay Panel */}
        {showViewportList && (
          <div className="absolute top-0 right-0 w-80 h-full bg-white/95 backdrop-blur-md border-l border-slate-200/80 shadow-2xl z-20 flex flex-col transition-all animate-slideLeft">
            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
              <h4 className="text-[13.5px] font-extrabold text-slate-800 flex items-center gap-1.5">
                <span>📍</span> 현재 화면 내 고객 ({viewportCustomers.length}명)
              </h4>
              <button
                onClick={() => setShowViewportList(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full bg-slate-100"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {viewportCustomers.length > 0 ? (
                viewportCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3 bg-white border border-slate-100 rounded-xl shadow-sm flex flex-col gap-2 hover:border-blue-200 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-[13px] text-slate-800 font-bold">
                          {customer.name}
                        </strong>
                        <button
                          onClick={() => onToggleStar(customer.id, !customer.favorite)}
                          className="text-amber-400 text-sm"
                        >
                          {customer.favorite ? "★" : "☆"}
                        </button>
                      </div>
                      <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${getStatusBadgeStyle(customer.status)}`}>
                        {getDisplayLabel(customer.status)}
                      </span>
                    </div>
                    
                    <p className="text-[11px] text-slate-500 line-clamp-2">
                      {customer.address}
                    </p>

                    {customer.visit_time && (
                      <div className="text-[10.5px] text-slate-600 font-semibold flex items-center gap-1 bg-slate-50 px-2 py-1 rounded-md w-fit">
                        ⏰ {formatVisitTime(customer.visit_time)} 방문
                      </div>
                    )}

                    <div className="flex justify-end gap-1.5 border-t border-slate-50 pt-2 mt-1">
                      {customer.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          className="w-7 h-7 bg-slate-50 hover:bg-slate-100 border border-slate-200/50 rounded-lg flex items-center justify-center text-slate-500 text-xs transition"
                          title="전화"
                        >
                          📞
                        </a>
                      )}
                      <button
                        onClick={() => handleNaviOpen("tmap", customer)}
                        className="w-7 h-7 bg-slate-50 hover:bg-amber-50/20 border border-slate-200/50 rounded-lg flex items-center justify-center text-amber-500 font-extrabold text-[10px] transition"
                        title="TMap"
                      >
                        T
                      </button>
                      <button
                        onClick={() => handleNaviOpen("nmap", customer)}
                        className="w-7 h-7 bg-slate-50 hover:bg-emerald-50/20 border border-slate-200/50 rounded-lg flex items-center justify-center text-emerald-500 font-extrabold text-[10px] transition"
                        title="NMap"
                      >
                        N
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-[12px] text-slate-400">
                  현재 지도 영역 안에 <br /> 해당하는 고객이 없습니다.
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* DateTime Picker Modal */}
      {activeDateTimePickerId !== null && (
        <DateTimePicker
          initialValue={tempTime}
          onSave={(dateTimeStr) => {
            onUpdateVisitTime(activeDateTimePickerId, dateTimeStr);
            setActiveDateTimePickerId(null);
          }}
          onCancel={() => setActiveDateTimePickerId(null)}
        />
      )}
    </div>
  );
}
