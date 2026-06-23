"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";
import { Customer, FailedCustomer } from "../../../domain/entities/types";
// @ts-ignore
import * as Hangul from "hangul-js";
import { useStatus } from "../../components/StatusContext";
import DateTimePicker from "../../components/DateTimePicker";
import MemoModal from "../../components/MemoModal";
import { formatVisitTime } from "../../../../components/utils/mapHtmlTemplates";

interface CustomerTabProps {
  customers: Customer[];
  failedCustomers: FailedCustomer[];
  onDeleteCustomer: (id: number) => void;
  onClearAll: () => void;
  onRefresh: () => Promise<void>;
  onToggleStar: (id: number, favorite: boolean) => void;
  onUpdateVisitTime: (id: number, time: string | null) => void;
  onUpdateStatus: (id: number, status: string) => void;
  onEditAddress: (id: number, address: string) => Promise<boolean>;
  onUpdateMemo: (id: number, memo: string) => Promise<boolean>;
  onUploadExcel: (file: File) => Promise<boolean>;
  isFetching: boolean;
}

export default function CustomerTab({
  customers,
  failedCustomers,
  onDeleteCustomer,
  onClearAll,
  onRefresh,
  onToggleStar,
  onUpdateVisitTime,
  onUpdateStatus,
  onEditAddress,
  onUpdateMemo,
  onUploadExcel,
  isFetching,
}: CustomerTabProps) {
  const { getDisplayLabel, statusLabels } = useStatus();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [sortBy, setSortBy] = useState("name"); // "name" | "status" | "address"
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [visibleCount, setVisibleCount] = useState(15);

  // Failed address accordion & edit states
  const [isFailedListOpen, setIsFailedListOpen] = useState(false);
  const [editFailedId, setEditFailedId] = useState<number | null>(null);
  const [editFailedText, setEditFailedText] = useState("");

  // Customer card scheduling states
  const [activeDateTimePickerId, setActiveDateTimePickerId] = useState<
    number | null
  >(null);
  const [tempTime, setTempTime] = useState<string | null>(null);

  // Memo editor states
  const [activeMemoId, setActiveMemoId] = useState<number | null>(null);
  const [memoTempText, setMemoTempText] = useState("");

  const formatPhoneNumber = (phone: string | null | undefined) => {
    if (!phone) return "";
    let s = ("" + phone).trim();
    if (s.endsWith(".0")) {
      s = s.substring(0, s.length - 2);
    }
    let cleaned = s.replace(/\D/g, "");

    // Prepend leading zero if it was stripped (e.g. 1012345678 -> 01012345678)
    if (
      cleaned.startsWith("1") &&
      (cleaned.length === 9 || cleaned.length === 10)
    ) {
      cleaned = "0" + cleaned;
    }

    // Fix POI/Excel scientific notation artifact: 010123456789 (12 digits ending in 9)
    if (
      cleaned.length === 12 &&
      cleaned.startsWith("01") &&
      cleaned.endsWith("9")
    ) {
      cleaned = cleaned.substring(0, cleaned.length - 1);
    }

    const len = cleaned.length;

    // 1. Seoul area code (02-XXX-XXXX or 02-XXXX-XXXX)
    if (cleaned.startsWith("02")) {
      if (len === 10) {
        return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
      } else if (len === 9) {
        return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
      }
    }

    // 2. Standard 11-digit mobile/provincial (010-XXXX-XXXX or 031-XXXX-XXXX)
    if (len === 11) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
    }

    // 3. Standard 10-digit mobile/provincial (010-XXX-XXXX or 031-XXX-XXXX)
    if (len === 10) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // 4. provincial 9-digit (031-XXX-XX or similar)
    if (len === 9) {
      return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
    }

    // 5. Representative company numbers (1588-1234)
    if (len === 8) {
      return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
    }

    return phone;
  };

  const handleFilterToggle = (status: string) => {
    if (status === "전체") {
      setSelectedFilters([]);
      return;
    }
    setSelectedFilters((prev) =>
      prev.includes(status)
        ? prev.filter((x) => x !== status)
        : [...prev, status],
    );
  };

  const handleRecentActivity = (id: number) => {
    try {
      const saved = localStorage.getItem("recentActivity");
      const ids: number[] = saved ? JSON.parse(saved) : [];
      const newIds = [id, ...ids.filter((x) => x !== id)].slice(0, 10);
      localStorage.setItem("recentActivity", JSON.stringify(newIds));
    } catch (e) {
      console.error("Failed to update recent activity:", e);
    }
  };

  // Filter logic
  const filteredCustomers = useMemo(() => {
    const validCustomers = customers.filter((c) => c.latitude && c.longitude);
    return validCustomers.filter((c) => {
      const matchesSearch = searchTerm
        ? Hangul.search(c.name || "", searchTerm) !== -1 ||
          Hangul.search(c.address || "", searchTerm) !== -1 ||
          (c.phone &&
            c.phone.replace(/-/g, "").includes(searchTerm.replace(/-/g, "")))
        : true;

      if (selectedFilters.length === 0) return matchesSearch;

      // Status filters: 미컨택(또는 미연락), 컨택, 완료
      // 이들은 OR 조건으로 처리
      const statusFilters = selectedFilters.filter((f) =>
        ["미컨택", statusLabels.none, "컨택", "완료"].includes(f),
      );

      let matchesStatus = true;
      if (statusFilters.length > 0) {
        matchesStatus = statusFilters.some((filter) => {
          if (filter === "미컨택" || filter === statusLabels.none) {
            return !c.status || c.status === "미컨택" || c.status === "미연락";
          }
          if (filter === "컨택") {
            return c.status === "컨택";
          }
          if (filter === "완료") {
            return c.status === "완료";
          }
          return false;
        });
      }

      // 그 외 필터들 (일정 있음, ⭐): 이들은 AND 조건으로 추가 만족해야 함
      const extraFilters = selectedFilters.filter(
        (f) => !["미컨택", statusLabels.none, "컨택", "완료"].includes(f),
      );
      const matchesExtras = extraFilters.every((filter) => {
        if (filter === "일정 있음") {
          return !!c.visit_time;
        }
        if (filter === "⭐") {
          return !!c.favorite;
        }
        return true;
      });

      return matchesSearch && matchesStatus && matchesExtras;
    });
  }, [customers, searchTerm, selectedFilters, statusLabels]);

  // Sorting logic
  const sortedCustomers = useMemo(() => {
    const list = [...filteredCustomers];
    if (sortBy === "name") {
      list.sort((a, b) => a.name.localeCompare(b.name, "ko"));
    } else if (sortBy === "status") {
      const statusOrder: { [key: string]: number } = {
        미컨택: 0,
        미연락: 0,
        컨택: 1,
        완료: 2,
      };
      list.sort((a, b) => {
        const orderA = statusOrder[a.status || "미컨택"] ?? 0;
        const orderB = statusOrder[b.status || "미컨택"] ?? 0;
        return orderA - orderB;
      });
    } else if (sortBy === "address") {
      list.sort((a, b) => a.address.localeCompare(b.address, "ko"));
    } else if (sortBy === "visit_time") {
      list.sort((a, b) => {
        const timeA = a.visit_time || "9999-99-99 99:99";
        const timeB = b.visit_time || "9999-99-99 99:99";
        return timeA.localeCompare(timeB);
      });
    }
    return list;
  }, [filteredCustomers, sortBy]);

  const visibleCustomers = useMemo(() => {
    return sortedCustomers.slice(0, visibleCount);
  }, [sortedCustomers, visibleCount]);

  useEffect(() => {
    // Reset visible count when filters or search terms change
    setVisibleCount(15);
  }, [searchTerm, selectedFilters, sortBy]);

  // Infinite scroll effect
  useEffect(() => {
    const sentinel = document.getElementById("scroll-sentinel");
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setVisibleCount((prev) =>
            Math.min(prev + 15, sortedCustomers.length),
          );
        }
      },
      { threshold: 0.1 },
    );

    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [visibleCount, sortedCustomers.length]);

  // Navigation redirect handler
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

  // Edit failed address handler
  const handleFailedAddressSubmit = async (id: number) => {
    if (!editFailedText.trim()) return;
    const success = await onEditAddress(id, editFailedText);
    if (success) {
      setEditFailedId(null);
    } else {
      alert(
        "수정된 주소로도 좌표를 조회하지 못했습니다. 주소를 다시 확인해 주세요.",
      );
    }
  };

  return (
    <div className="flex flex-col gap-4 p-5 pb-24 min-h-[calc(100vh-140px)] relative">
      {/* Search Input */}
      <div className="flex items-center gap-2 bg-white border border-slate-100 shadow-sm rounded-2xl px-4 py-3">
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
          placeholder="이름, 주소, 전화번호 검색"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1 bg-transparent border-0 outline-none text-[13.5px] text-slate-800 placeholder-slate-400 font-medium"
        />
        <button className="text-slate-400 hover:text-blue-500 transition">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <line x1="4" y1="21" x2="4" y2="14"></line>
            <line x1="4" y1="10" x2="4" y2="3"></line>
            <line x1="12" y1="21" x2="12" y2="12"></line>
            <line x1="12" y1="8" x2="12" y2="3"></line>
            <line x1="20" y1="21" x2="20" y2="16"></line>
            <line x1="20" y1="12" x2="20" y2="3"></line>
            <line x1="1" y1="14" x2="7" y2="14"></line>
            <line x1="9" y1="8" x2="15" y2="8"></line>
            <line x1="17" y1="16" x2="23" y2="16"></line>
          </svg>
        </button>
      </div>

      {/* Address Errors Section */}
      {failedCustomers.length > 0 && (
        <div className="flex flex-col gap-3 p-4.5 bg-rose-50/50 border border-rose-100 rounded-2xl shadow-sm">
          <button
            onClick={() => setIsFailedListOpen(!isFailedListOpen)}
            className="flex justify-between items-center w-full text-left"
          >
            <div className="font-extrabold text-[13.5px] text-rose-600 flex items-center gap-1.5">
              <span className="w-5 h-5 flex items-center justify-center bg-rose-100 rounded-full text-xs">
                ⚠️
              </span>
              주소 오류 목록 ({failedCustomers.length}건)
            </div>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={`text-rose-400 transition-transform ${isFailedListOpen ? "rotate-180" : ""}`}
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>

          {isFailedListOpen && (
            <ul className="flex flex-col gap-3 max-h-60 overflow-y-auto mt-2 pt-3 border-t border-rose-100/50">
              {failedCustomers.map((item) => (
                <li
                  key={item.id}
                  className="text-xs pb-3 flex flex-col gap-2 border-b border-rose-100/30 last:border-0"
                >
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex flex-col gap-0.5">
                      <strong className="text-slate-800 text-[13px] font-bold">
                        {item.name}
                      </strong>
                      <span className="text-slate-500 text-[11.5px]">
                        {item.address}
                      </span>
                    </div>
                    <div className="flex gap-1.5 shrink-0">
                      <button
                        onClick={() => {
                          setEditFailedId(item.id);
                          setEditFailedText(item.address);
                        }}
                        className="text-slate-500 hover:text-blue-600 px-2 py-1 bg-white rounded-lg border border-slate-200 text-[11px] font-bold"
                      >
                        수정
                      </button>
                      <button
                        onClick={() => onDeleteCustomer(item.id)}
                        className="text-rose-500 hover:text-rose-700 px-2 py-1 bg-rose-50/50 rounded-lg border border-rose-100 text-[11px] font-bold"
                      >
                        삭제
                      </button>
                    </div>
                  </div>
                  {editFailedId === item.id && (
                    <div className="flex gap-1.5 mt-1">
                      <input
                        type="text"
                        className="flex-1 px-3 py-1.5 rounded-xl border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-400 bg-white text-[12px]"
                        value={editFailedText}
                        onChange={(e) => setEditFailedText(e.target.value)}
                      />
                      <button
                        onClick={() => handleFailedAddressSubmit(item.id)}
                        className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold rounded-xl text-[11.5px]"
                      >
                        확인
                      </button>
                      <button
                        onClick={() => setEditFailedId(null)}
                        className="px-3 py-1.5 bg-slate-200 text-slate-600 rounded-xl text-[11.5px]"
                      >
                        취소
                      </button>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Status Chips */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[statusLabels.none, "컨택", "완료", "일정 있음", "⭐", "전체"].map(
          (status) => {
            const isSelected =
              status === "전체"
                ? selectedFilters.length === 0
                : selectedFilters.includes(status);

            let activeStyle = "";
            let defaultStyle = "";

            if (status === statusLabels.none) {
              activeStyle =
                "bg-rose-50 text-rose-600 border border-rose-200 font-bold";
              defaultStyle =
                "bg-white text-slate-500 border border-slate-100 hover:bg-rose-50/20";
            } else if (status === "컨택") {
              activeStyle =
                "bg-amber-50 text-amber-600 border border-amber-200 font-bold";
              defaultStyle =
                "bg-white text-slate-500 border border-slate-100 hover:bg-amber-50/20";
            } else if (status === "완료") {
              activeStyle =
                "bg-blue-50 text-blue-600 border border-blue-200 font-bold";
              defaultStyle =
                "bg-white text-slate-500 border border-slate-100 hover:bg-blue-50/20";
            } else if (status === "일정 있음") {
              activeStyle =
                "bg-indigo-50 text-indigo-600 border border-indigo-200 font-bold";
              defaultStyle =
                "bg-white text-slate-500 border border-slate-100 hover:bg-indigo-50/20";
            } else if (status === "⭐") {
              activeStyle =
                "bg-amber-50 text-amber-600 border border-amber-200 font-bold";
              defaultStyle =
                "bg-white text-slate-500 border border-slate-100 hover:bg-amber-50/20";
            } else {
              activeStyle =
                "bg-slate-100 text-slate-700 border border-slate-200 font-bold";
              defaultStyle =
                "bg-white text-slate-500 border border-slate-100 hover:bg-slate-50";
            }

            return (
              <button
                key={status}
                onClick={() => handleFilterToggle(status)}
                className={`px-3.5 py-1.5 rounded-full text-[12.5px] transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                  isSelected ? activeStyle : defaultStyle
                }`}
              >
                <span>{status}</span>
              </button>
            );
          },
        )}
      </div>

      {/* Sorting dropdown & Refresh */}
      <div className="flex justify-between items-center text-[12px] px-1">
        <div className="flex items-center gap-1 bg-white border border-slate-200/60 rounded-xl px-2.5 py-1.5 text-slate-600 font-semibold shadow-sm">
          <span>정렬</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="outline-none bg-transparent font-bold cursor-pointer text-slate-800 text-[12px]"
          >
            <option value="name">이름순</option>
            <option value="status">상태순</option>
            <option value="address">주소순</option>
            <option value="visit_time">일정순</option>
          </select>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onClearAll}
            className="flex items-center gap-1 text-rose-500 hover:text-rose-700 transition font-bold px-2 py-1"
          >
            🗑️ 전체 초기화
          </button>

          <button
            onClick={onRefresh}
            disabled={isFetching}
            className="flex items-center gap-1 text-slate-500 hover:text-blue-600 transition font-bold px-2 py-1"
          >
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className={isFetching ? "animate-spin text-blue-600" : ""}
            >
              <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
            </svg>
          </button>
        </div>
      </div>

      {/* Customer List */}
      <div className="flex flex-col gap-3">
        {visibleCustomers.length > 0 ? (
          visibleCustomers.map((customer) => {
            let statusBg = "bg-rose-500";
            let badgeStyle = "bg-rose-50 text-rose-600 border-rose-200/40";

            if (customer.status === "컨택") {
              statusBg = "bg-amber-500";
              badgeStyle = "bg-amber-50 text-amber-600 border-amber-200/40";
            } else if (customer.status === "완료") {
              statusBg = "bg-blue-500";
              badgeStyle = "bg-blue-50 text-blue-600 border-blue-200/40";
            }

            return (
              <div
                key={customer.id}
                className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col gap-3 hover:shadow-md/5 transition relative overflow-hidden"
              >
                <div className="flex justify-between items-start gap-4">
                  <div className="flex items-start gap-1.5 min-w-0">
                    <div className="flex flex-col gap-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <strong className="text-[14px] text-slate-800 font-extrabold">
                          {customer.name} 고객
                        </strong>
                        <button
                          onClick={() => {
                            onToggleStar(customer.id, !customer.favorite);
                            handleRecentActivity(customer.id);
                          }}
                          className="text-amber-400 font-bold active:scale-90 transition text-md focus:outline-none"
                        >
                          {customer.favorite ? "★" : "☆"}
                        </button>
                      </div>

                      {customer.phone && (
                        <a
                          href={`tel:${customer.phone}`}
                          onClick={() => handleRecentActivity(customer.id)}
                          className="text-[12.5px] text-slate-500 hover:text-slate-700 font-bold hover:underline w-fit"
                        >
                          ☎︎ {formatPhoneNumber(customer.phone)}
                        </a>
                      )}

                      <span className="text-[12px] text-slate-500 leading-relaxed font-normal mt-0.5">
                        {customer.address}
                      </span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1 items-end shrink-0">
                    {/* Status Badge Dropdown Switcher */}
                    <select
                      value={customer.status || "미컨택"}
                      onChange={(e) => {
                        onUpdateStatus(customer.id, e.target.value);
                        handleRecentActivity(customer.id);
                      }}
                      className={`text-[10px] font-extrabold px-1.5 py-0.5 rounded-md border outline-none cursor-pointer appearance-none text-center bg-white ${badgeStyle}`}
                    >
                      <option value="미컨택">{statusLabels.none}</option>
                      <option value="컨택">{statusLabels.contact}</option>
                      <option value="완료">{statusLabels.done}</option>
                    </select>
                    <button
                      onClick={() => onDeleteCustomer(customer.id)}
                      className="text-[10px] font-bold text-slate-300 hover:text-rose-500 transition px-1.5 py-1"
                    >
                      삭제
                    </button>
                  </div>
                </div>

                {/* Memo Area - only visible when exists */}
                {customer.memo && customer.memo.trim() !== "" && (
                  <div
                    onClick={() => {
                      setActiveMemoId(customer.id);
                      setMemoTempText(customer.memo || "");
                    }}
                    className="bg-slate-50/50 hover:bg-slate-100/50 p-2.5 rounded-xl border border-slate-200/30 text-[12px] text-slate-600 cursor-pointer flex flex-col gap-1"
                  >
                    <span className="font-bold text-slate-400 text-[10.5px] flex items-center gap-1">
                      📝 메모
                    </span>
                    <p className="line-clamp-2 italic text-slate-700 font-medium whitespace-pre-line">
                      {customer.memo}
                    </p>
                  </div>
                )}

                {/* Scheduling Area - only visible when exists */}
                {customer.visit_time && customer.visit_time.trim() !== "" && (
                  <div className="flex items-center justify-between bg-slate-50/30 p-2.5 rounded-xl border border-slate-100/50 text-[11.5px] text-slate-500">
                    <span className="font-semibold flex items-center gap-1">
                      ⏰ 방문일정
                    </span>
                    <div className="flex items-center gap-1.5">
                      <span>{formatVisitTime(customer.visit_time)} 방문</span>
                      <button
                        onClick={() => {
                          setTempTime(customer.visit_time || null);
                          setActiveDateTimePickerId(customer.id);
                        }}
                        className="text-blue-600 font-extrabold hover:underline cursor-pointer"
                      >
                        변경
                      </button>
                    </div>
                  </div>
                )}

                {/* Card Actions (Memo, Calendar, TMap, Naver Map) */}
                <div className="flex justify-end items-center gap-2 border-t border-slate-50 pt-2.5">
                  <button
                    onClick={() => {
                      setActiveMemoId(customer.id);
                      setMemoTempText(customer.memo || "");
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/30 flex items-center justify-center transition"
                    title="메모 작성/수정"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-500"
                    >
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      setTempTime(customer.visit_time || null);
                      setActiveDateTimePickerId(customer.id);
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200/30 flex items-center justify-center transition"
                    title="방문 일정 설정"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      className="text-slate-500"
                    >
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                      <line x1="16" y1="2" x2="16" y2="6" />
                      <line x1="8" y1="2" x2="8" y2="6" />
                      <line x1="3" y1="10" x2="21" y2="10" />
                    </svg>
                  </button>

                  <button
                    onClick={() => {
                      handleNaviOpen("tmap", customer);
                      handleRecentActivity(customer.id);
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-blue-50/20 border border-slate-200/30 flex items-center justify-center text-blue-600 font-extrabold text-[12.5px] transition"
                    title="티맵 네비"
                  >
                    T
                  </button>

                  <button
                    onClick={() => {
                      handleNaviOpen("nmap", customer);
                      handleRecentActivity(customer.id);
                    }}
                    className="w-9 h-9 rounded-xl bg-slate-50 hover:bg-emerald-50/20 border border-slate-200/30 flex items-center justify-center text-emerald-600 font-extrabold text-[12.5px] transition"
                    title="네이버 네비"
                  >
                    N
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-16 text-center text-[13px] text-slate-400 bg-white border border-slate-100 rounded-2xl shadow-sm">
            등록된 고객 목록이 없습니다. <br />
            오른쪽 아래 + 버튼을 눌러 추가해주세요!
          </div>
        )}
      </div>

      {/* Sentinel element for infinite scroll */}
      {visibleCount < sortedCustomers.length && (
        <div
          id="scroll-sentinel"
          className="py-4 flex items-center justify-center text-[12.5px] text-slate-400 font-semibold gap-1.5 animate-pulse"
        >
          <div className="w-4 h-4 border-2 border-slate-400 border-t-transparent rounded-full animate-spin"></div>
          고객 불러오는 중...
        </div>
      )}

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

      {/* Memo Editor Modal */}
      {activeMemoId !== null && (
        <MemoModal
          customerName={
            customers.find((c) => c.id === activeMemoId)?.name || ""
          }
          initialMemo={memoTempText}
          onSave={async (newMemo) => {
            const success = await onUpdateMemo(activeMemoId, newMemo);
            if (success) {
              handleRecentActivity(activeMemoId);
            }
            return success;
          }}
          onCancel={() => setActiveMemoId(null)}
        />
      )}
    </div>
  );
}
