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
  onToggleAbsent: (id: number, absent: boolean) => void;
  onUpdateVisitTime: (id: number, time: string | null) => void;
  onUpdateStatus: (id: number, status: string) => void;
  setActiveTab: (tab: string) => void;
}

export default function MapTab({
  customers,
  backendIp,
  onToggleStar,
  onToggleAbsent,
  onUpdateVisitTime,
  onUpdateStatus,
  setActiveTab,
}: MapTabProps) {
  const { getDisplayLabel, statusLabels } = useStatus();
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
        (statusFilter === "부재중" && !!c.absent) ||
        (statusFilter === statusLabels.none && (!c.status || c.status === "미컨택" || c.status === statusLabels.none)) ||
        c.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [customers, searchTerm, statusFilter, statusLabels]);

  // Derive visible customers currently in the viewport bounds
  const viewportCustomers = useMemo(() => {
    return filteredCustomers.filter((c) => visibleCustomerIds.includes(c.id));
  }, [filteredCustomers, visibleCustomerIds]);

  // Hook into window for star toggle & time edit from maps
  useEffect(() => {
    (window as any).reactToggleFavoriteHook = (id: number, favorite: boolean) => {
      onToggleStar(id, favorite);
    };

    (window as any).reactToggleAbsentHook = (id: number, absent: boolean) => {
      onToggleAbsent(id, absent);
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
      delete (window as any).reactToggleAbsentHook;
      delete (window as any).reactEditTimeHook;
      delete (window as any).reactUpdateStatusHook;
    };
  }, [onToggleStar, onToggleAbsent, onUpdateStatus]);

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
    const displayLabel = getDisplayLabel(status);
    if (displayLabel === "완료") {
      return "bg-[#5B9CF6]/10 text-[#5B9CF6] border border-[#5B9CF6]/20 font-extrabold";
    }
    if (displayLabel === "진행중" || displayLabel === "상담중" || status === "컨택") {
      return "bg-[#F2B84B]/10 text-[#F2B84B] border border-[#F2B84B]/20 font-extrabold";
    }
    if (status === "주소 오류" || status === "취소") {
      return "bg-[#9AA3AF]/10 text-[#9AA3AF] border border-[#9AA3AF]/20 font-extrabold";
    }
    return "bg-[#E87B72]/10 text-[#E87B72] border border-[#E87B72]/20 font-extrabold";
  };

  return (
    <div className="w-full h-[calc(100vh-80px)] relative flex flex-col bg-transparent">
      {/* Search and Filters Header */}
      <div className="w-full glass-header p-4 flex flex-col gap-3 z-10 shadow-sm">
        <div className="flex items-center gap-2 bg-white/40 border border-white/20 backdrop-blur-md rounded-xl px-3 py-2.5 shadow-inner">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#6b7280"
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
          {[statusLabels.none, "컨택", "완료", "부재중", "전체"].map((status) => {
            const isSelected = statusFilter === status;
            let activeStyle = "";
            let defaultStyle = "";

            if (status === statusLabels.none) {
              activeStyle = "bg-[#E87B72]/20 text-[#E87B72] border border-[#E87B72]/30 font-extrabold";
              defaultStyle = "bg-white/40 text-slate-600 border border-white/20 hover:bg-[#E87B72]/10";
            } else if (status === "컨택") {
              activeStyle = "bg-[#F2B84B]/20 text-[#F2B84B] border border-[#F2B84B]/30 font-extrabold";
              defaultStyle = "bg-white/40 text-slate-600 border border-white/20 hover:bg-[#F2B84B]/10";
            } else if (status === "완료") {
              activeStyle = "bg-[#5B9CF6]/20 text-[#5B9CF6] border border-[#5B9CF6]/30 font-extrabold";
              defaultStyle = "bg-white/40 text-slate-600 border border-white/20 hover:bg-[#5B9CF6]/10";
            } else if (status === "부재중") {
              activeStyle = "bg-rose-500/20 text-rose-600 border border-rose-500/30 font-extrabold";
              defaultStyle = "bg-white/40 text-slate-600 border border-white/20 hover:bg-rose-500/10";
            } else {
              activeStyle = "bg-[#4F8EF7]/20 text-[#4F8EF7] border border-[#4F8EF7]/30 font-extrabold";
              defaultStyle = "bg-white/40 text-slate-600 border border-white/20 hover:bg-[#4F8EF7]/10";
            }

            return (
              <button
                key={status}
                onClick={() => {
                  if (typeof document !== "undefined" && document.activeElement instanceof HTMLElement) {
                    document.activeElement.blur();
                  }
                  setStatusFilter(status);
                }}
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
        <div className="absolute top-4 right-4 z-10 flex bg-white/45 backdrop-blur-md rounded-xl shadow-sm border border-white/25 p-0.5 animate-slide-up">
          <button
            onClick={() => setShowViewportList(false)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold transition-all cursor-pointer ${
              !showViewportList
                ? "bg-[#4F8EF7] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            🗺️ 지도
          </button>
          <button
            onClick={() => setShowViewportList(true)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[12px] font-extrabold transition-all cursor-pointer ${
              showViewportList
                ? "bg-[#4F8EF7] text-white shadow-sm"
                : "text-slate-600 hover:text-slate-800"
            }`}
          >
            📋 리스트
          </button>
        </div>

        {/* Viewport Bound Customers Overlay Panel */}
        {showViewportList && (
          <div className="absolute top-0 right-0 w-80 h-full bg-white/45 backdrop-blur-xl border-l border-white/20 shadow-2xl z-20 flex flex-col transition-all animate-slideLeft">
            <div className="p-4 border-b border-white/10 flex justify-between items-center bg-white/20">
              <h4 className="text-[13.5px] font-black text-slate-800 flex items-center gap-1.5">
                <span>📍</span> 현재 화면 내 고객 ({viewportCustomers.length}명)
              </h4>
              <button
                onClick={() => setShowViewportList(false)}
                className="text-slate-400 hover:text-slate-600 text-sm font-bold w-6 h-6 flex items-center justify-center rounded-full bg-white/50 border border-slate-200/10 cursor-pointer"
              >
                ✕
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-3">
              {viewportCustomers.length > 0 ? (
                viewportCustomers.map((customer) => (
                  <div
                    key={customer.id}
                    className="p-3.5 glass-card glass-card-interactive flex flex-col gap-2 transition"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex items-center gap-1.5 min-w-0">
                        <strong className="text-[13.5px] text-slate-900 font-black truncate">
                          {customer.name}
                        </strong>
                        <button
                          onClick={() => onToggleStar(customer.id, !customer.favorite)}
                          className="text-amber-400 text-sm hover:scale-110 active:scale-95 transition cursor-pointer"
                        >
                          {customer.favorite ? "★" : "☆"}
                        </button>
                      </div>
                      <span className={`text-[9.5px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${getStatusBadgeStyle(customer.status)}`}>
                        {getDisplayLabel(customer.status)}
                      </span>
                    </div>
                    
                    <p className="text-[11.5px] text-slate-500 line-clamp-2 leading-relaxed">
                      {customer.address}
                    </p>

                    {customer.visit_time && (
                      <div className="text-[10.5px] text-primary font-bold flex items-center gap-1 bg-primary/10 border border-primary/15 px-2.5 py-1 rounded-lg w-fit mt-1">
                        ⏰ {formatVisitTime(customer.visit_time)} 방문
                      </div>
                    )}

                    <div className="flex justify-end gap-2 border-t border-slate-100/10 pt-2.5 mt-1.5">
                      {customer.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          className="w-8 h-8 bg-white/60 hover:bg-primary/10 border border-slate-200/10 shadow-sm rounded-xl flex items-center justify-center text-slate-600 hover:text-primary text-[12.5px] transition"
                          title="전화"
                        >
                          📞
                        </a>
                      )}
                      <button
                        onClick={() => handleNaviOpen("tmap", customer)}
                        className="w-8 h-8 bg-white/60 hover:bg-amber-500/10 border border-slate-200/10 shadow-sm rounded-xl flex items-center justify-center text-amber-500 font-black text-[11px] transition cursor-pointer"
                        title="TMap"
                      >
                        T
                      </button>
                      <button
                        onClick={() => handleNaviOpen("nmap", customer)}
                        className="w-8 h-8 bg-white/60 hover:bg-emerald-500/10 border border-slate-200/10 shadow-sm rounded-xl flex items-center justify-center text-emerald-500 font-black text-[11px] transition cursor-pointer"
                        title="NMap"
                      >
                        N
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="py-20 text-center text-[12.5px] font-bold text-slate-500">
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
