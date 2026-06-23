"use client";

import React, { useState, useMemo } from "react";
import { Customer } from "../../domain/entities/types";

interface CalendarModalProps {
  customers: Customer[];
  onClose: () => void;
}

export default function CalendarModal({ customers, onClose }: CalendarModalProps) {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth(); // 0-indexed

  // Months/Days Helper
  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
  const weekDays = ["일", "월", "화", "수", "목", "금", "토"];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  // Generate days in calendar month
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(year, month, 1).getDay();
    const lastDate = new Date(year, month + 1, 0).getDate();
    const days: (Date | null)[] = [];

    // Empty padding cells before month starts
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }

    // Actual day dates
    for (let i = 1; i <= lastDate; i++) {
      days.push(new Date(year, month, i));
    }

    return days;
  }, [year, month]);

  // Format date helper: "YYYY-MM-DD"
  const formatDateKey = (date: Date) => {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  };

  // Map of date strings -> Customer schedules
  const scheduleMap = useMemo(() => {
    const map: { [dateStr: string]: Customer[] } = {};
    customers.forEach((c) => {
      if (c.visit_time) {
        const parts = c.visit_time.split(" ");
        if (parts.length === 2) {
          const dateStr = parts[0];
          if (!map[dateStr]) map[dateStr] = [];
          map[dateStr].push(c);
        }
      }
    });

    // Sort each day's schedules chronologically
    Object.keys(map).forEach((dateStr) => {
      map[dateStr].sort((a, b) => (a.visit_time || "").localeCompare(b.visit_time || ""));
    });

    return map;
  }, [customers]);

  // Selected date schedule list
  const selectedDateKey = formatDateKey(selectedDate);
  const dailySchedules = scheduleMap[selectedDateKey] || [];

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
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-5 z-[100] transition-all animate-fadeIn">
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 border border-slate-100 shadow-2xl max-h-[85vh]">
        {/* Header */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-2.5 shrink-0">
          <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-1.5">
            <span>📅</span> 전체 방문 일정 달력
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-[14px] font-bold w-7 h-7 flex items-center justify-center rounded-full bg-slate-50 border border-slate-200/40">
            ✕
          </button>
        </div>

        {/* Year/Month selectors */}
        <div className="flex justify-between items-center px-1 shrink-0">
          <span className="text-[14px] font-extrabold text-slate-800">
            {year}년 {monthNames[month]}
          </span>
          <div className="flex gap-1.5">
            <button
              onClick={handlePrevMonth}
              className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200/40 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              ◀
            </button>
            <button
              onClick={handleNextMonth}
              className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-200/40 rounded-lg text-slate-500 hover:bg-slate-100"
            >
              ▶
            </button>
          </div>
        </div>

        {/* Week Day headers */}
        <div className="grid grid-cols-7 text-center text-[10.5px] font-bold text-slate-400 shrink-0">
          {weekDays.map((d) => (
            <span key={d}>{d}</span>
          ))}
        </div>

        {/* Days Grid */}
        <div className="grid grid-cols-7 text-center gap-y-1.5 shrink-0">
          {calendarDays.map((d, index) => {
            if (!d) return <span key={`empty-${index}`} />;

            const dateStr = formatDateKey(d);
            const isSelected =
              d.getDate() === selectedDate.getDate() &&
              d.getMonth() === selectedDate.getMonth() &&
              d.getFullYear() === selectedDate.getFullYear();

            const isToday =
              d.getDate() === new Date().getDate() &&
              d.getMonth() === new Date().getMonth() &&
              d.getFullYear() === new Date().getFullYear();

            const daySchedules = scheduleMap[dateStr] || [];
            const hasSchedules = daySchedules.length > 0;

            return (
              <button
                key={dateStr}
                onClick={() => setSelectedDate(d)}
                className={`w-8.5 h-8.5 rounded-full text-[12px] font-bold mx-auto transition-colors flex flex-col items-center justify-center relative ${
                  isSelected
                    ? "bg-blue-600 text-white"
                    : isToday
                    ? "bg-slate-100 text-blue-600 border border-blue-200/50"
                    : "text-slate-700 hover:bg-blue-50/50"
                }`}
              >
                <span>{d.getDate()}</span>
                {hasSchedules && (
                  <span
                    className={`absolute bottom-1 w-1 h-1 rounded-full ${
                      isSelected ? "bg-white" : "bg-blue-500"
                    }`}
                  />
                )}
              </button>
            );
          })}
        </div>

        {/* Divider */}
        <div className="h-px bg-slate-100 shrink-0" />

        {/* Selected Date Schedules Title */}
        <div className="text-[12.5px] font-bold text-slate-700 px-1 shrink-0 flex justify-between items-center">
          <span>📝 {selectedDate.getMonth() + 1}월 {selectedDate.getDate()}일 일정</span>
          <span className="text-[11px] text-slate-400 font-semibold">{dailySchedules.length}건</span>
        </div>

        {/* Day Schedules Scroll Area */}
        <div className="flex-1 overflow-y-auto min-h-0 flex flex-col gap-2.5 pr-0.5">
          {dailySchedules.length > 0 ? (
            dailySchedules.map((customer) => {
              const timeStr = customer.visit_time || "";
              const timePart = timeStr.split(" ")[1] || "";
              return (
                <div
                  key={customer.id}
                  className="p-3 bg-slate-50 border border-slate-200/40 rounded-2xl flex flex-col gap-2 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex flex-col gap-0.5">
                      <div className="flex items-center gap-1.5">
                        <strong className="text-[13px] text-slate-800 font-bold">
                          {customer.name}
                        </strong>
                        <span className={`text-[9px] font-extrabold px-1.5 py-0.5 rounded-md ${getStatusBadgeStyle(customer.status)}`}>
                          {customer.status || "미컨택"}
                        </span>
                      </div>
                      <span className="text-[10.5px] text-blue-600 font-bold">⏰ {timePart} 방문</span>
                    </div>
                  </div>

                  <p className="text-[11px] text-slate-500 line-clamp-1 leading-normal">
                    {customer.address}
                  </p>

                  <div className="flex justify-end gap-1.5 border-t border-slate-200/50 pt-2">
                    {customer.phone && (() => {
                      const formatPhoneNumber = (p: string) => {
                        let s = ("" + p).trim();
                        if (s.endsWith(".0")) {
                          s = s.substring(0, s.length - 2);
                        }
                        let cleaned = s.replace(/\D/g, "");
                        if (cleaned.startsWith("1") && (cleaned.length === 9 || cleaned.length === 10)) {
                          cleaned = "0" + cleaned;
                        }
                        if (cleaned.length === 12 && cleaned.startsWith("01") && cleaned.endsWith("9")) {
                          cleaned = cleaned.substring(0, cleaned.length - 1);
                        }
                        const len = cleaned.length;
                        if (cleaned.startsWith("02")) {
                          if (len === 10) {
                            return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 6)}-${cleaned.slice(6)}`;
                          } else if (len === 9) {
                            return `${cleaned.slice(0, 2)}-${cleaned.slice(2, 5)}-${cleaned.slice(5)}`;
                          }
                        }
                        if (len === 11) {
                          return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 7)}-${cleaned.slice(7)}`;
                        }
                        if (len === 10) {
                          return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
                        }
                        if (len === 9) {
                          return `${cleaned.slice(0, 3)}-${cleaned.slice(3, 6)}-${cleaned.slice(6)}`;
                        }
                        if (len === 8) {
                          return `${cleaned.slice(0, 4)}-${cleaned.slice(4)}`;
                        }
                        return p;
                      };
                      return (
                        <a
                          href={`tel:${customer.phone}`}
                          className="text-[12px] text-slate-500 hover:text-slate-700 hover:underline"
                        >
                          📞 {formatPhoneNumber(customer.phone)}
                        </a>
                      );
                    })()}
                    <button
                      onClick={() => handleNaviOpen("tmap", customer)}
                      className="w-7 h-7 bg-white hover:bg-amber-50/20 border border-slate-200/50 rounded-lg flex items-center justify-center text-amber-500 font-extrabold text-[10px] transition"
                      title="TMap"
                    >
                      T
                    </button>
                    <button
                      onClick={() => handleNaviOpen("nmap", customer)}
                      className="w-7 h-7 bg-white hover:bg-emerald-50/20 border border-slate-200/50 rounded-lg flex items-center justify-center text-emerald-500 font-extrabold text-[10px] transition"
                      title="NMap"
                    >
                      N
                    </button>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="py-10 text-center text-[12px] text-slate-400 font-semibold bg-slate-50/40 border border-dashed border-slate-200/70 rounded-2xl">
              방문 일정이 없습니다.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
