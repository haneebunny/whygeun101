"use client";

import React, { useState, useMemo, useRef, useEffect } from "react";

interface DateTimePickerProps {
  initialValue?: string | null; // Format: "YYYY-MM-DD HH:mm" or null
  onSave: (dateTimeStr: string | null) => void;
  onCancel: () => void;
}

export default function DateTimePicker({
  initialValue,
  onSave,
  onCancel,
}: DateTimePickerProps) {
  // Parse initial value or default to now
  const parsedDate = useMemo(() => {
    if (initialValue) {
      const parts = initialValue.split(" ");
      if (parts.length === 2) {
        const [datePart, timePart] = parts;
        const [y, m, d] = datePart.split("-").map(Number);
        const [hr, min] = timePart.split(":").map(Number);
        return {
          date: new Date(y, m - 1, d),
          hour: hr,
          minute: min,
        };
      }
    }
    const now = new Date();
    return {
      date: now,
      hour: now.getHours(),
      minute: Math.round(now.getMinutes() / 5) * 5 % 60,
    };
  }, [initialValue]);

  // State management
  const [selectedDate, setSelectedDate] = useState<Date>(parsedDate.date);
  const [selectedHour, setSelectedHour] = useState<number>(parsedDate.hour);
  const [selectedMinute, setSelectedMinute] = useState<number>(parsedDate.minute);
  
  const [currentYear, setCurrentYear] = useState(selectedDate.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(selectedDate.getMonth()); // 0-indexed

  // Refs for scroll snapping spinner wheel list
  const hourScrollRef = useRef<HTMLDivElement>(null);
  const minuteScrollRef = useRef<HTMLDivElement>(null);

  // Generate lists for hour & minute spinners
  const hours = useMemo(() => Array.from({ length: 24 }, (_, i) => i), []);
  const minutes = useMemo(() => Array.from({ length: 12 }, (_, i) => i * 5), []); // 0, 5, 10, ... 55

  // Scroll to initial selected values
  useEffect(() => {
    setTimeout(() => {
      if (hourScrollRef.current) {
        const hourIndex = hours.indexOf(selectedHour);
        if (hourIndex !== -1) {
          hourScrollRef.current.scrollTop = hourIndex * 36;
        }
      }
      if (minuteScrollRef.current) {
        const minuteIndex = minutes.indexOf(selectedMinute);
        if (minuteIndex !== -1) {
          minuteScrollRef.current.scrollTop = minuteIndex * 36;
        }
      }
    }, 100);
  }, []);

  // Listen to scrolling to snap select values (iOS effect)
  const handleScroll = (
    ref: React.RefObject<HTMLDivElement | null>,
    items: number[],
    setter: (val: number) => void
  ) => {
    if (!ref.current) return;
    const scrollTop = ref.current.scrollTop;
    const itemHeight = 36; // 36px per line item height
    const index = Math.round(scrollTop / itemHeight);
    if (index >= 0 && index < items.length) {
      setter(items[index]);
    }
  };

  // Calendar calculations
  const calendarDays = useMemo(() => {
    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const lastDate = new Date(currentYear, currentMonth + 1, 0).getDate();
    const days: (Date | null)[] = [];
    
    // Fill empty padding before month start
    for (let i = 0; i < firstDayIndex; i++) {
      days.push(null);
    }
    
    // Fill dates
    for (let i = 1; i <= lastDate; i++) {
      days.push(new Date(currentYear, currentMonth, i));
    }
    
    return days;
  }, [currentYear, currentMonth]);

  const monthNames = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];

  const handlePrevMonth = () => {
    if (currentMonth === 0) {
      setCurrentMonth(11);
      setCurrentYear(currentYear - 1);
    } else {
      setCurrentMonth(currentMonth - 1);
    }
  };

  const handleNextMonth = () => {
    if (currentMonth === 11) {
      setCurrentMonth(0);
      setCurrentYear(currentYear + 1);
    } else {
      setCurrentMonth(currentMonth + 1);
    }
  };

  // Format date helper
  const handleSave = () => {
    const yyyy = selectedDate.getFullYear();
    const mm = String(selectedDate.getMonth() + 1).padStart(2, "0");
    const dd = String(selectedDate.getDate()).padStart(2, "0");
    const hh = String(selectedHour).padStart(2, "0");
    const min = String(selectedMinute).padStart(2, "0");
    
    onSave(`${yyyy}-${mm}-${dd} ${hh}:${min}`);
  };

  const handleDelete = () => {
    onSave(null); // Clear schedule
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-5 z-[100] transition-all animate-fadeIn">
      <div className="bg-white rounded-3xl p-5 w-full max-w-sm flex flex-col gap-4 border border-slate-100 shadow-2xl">
        {/* Title */}
        <div className="flex justify-between items-center border-b border-slate-100 pb-2">
          <h3 className="text-[15px] font-extrabold text-slate-800">📅 방문 일정 설정</h3>
          <button onClick={onCancel} className="text-slate-400 hover:text-slate-600 text-[13px] font-bold">
            ✕
          </button>
        </div>

        {/* 1. Date Picker Calendar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center px-1">
            <span className="text-[13px] font-bold text-slate-700">
              {currentYear}년 {monthNames[currentMonth]}
            </span>
            <div className="flex gap-1">
              <button
                onClick={handlePrevMonth}
                className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                ◀
              </button>
              <button
                onClick={handleNextMonth}
                className="w-7 h-7 flex items-center justify-center bg-slate-50 border border-slate-100 rounded-lg text-slate-500 hover:bg-slate-100"
              >
                ▶
              </button>
            </div>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 text-center text-[10.5px] font-bold text-slate-400 mt-1">
            {["일", "월", "화", "수", "목", "금", "토"].map((w) => (
              <span key={w}>{w}</span>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 text-center gap-y-1">
            {calendarDays.map((d, index) => {
              if (!d) return <span key={`empty-${index}`} />;
              const isSelected =
                d.getDate() === selectedDate.getDate() &&
                d.getMonth() === selectedDate.getMonth() &&
                d.getFullYear() === selectedDate.getFullYear();
              
              return (
                <button
                  key={d.toISOString()}
                  onClick={() => setSelectedDate(d)}
                  className={`w-8 h-8 rounded-full text-[12px] font-bold mx-auto transition-colors flex items-center justify-center ${
                    isSelected
                      ? "bg-blue-600 text-white"
                      : "text-slate-700 hover:bg-blue-50/50"
                  }`}
                >
                  {d.getDate()}
                </button>
              );
            })}
          </div>
        </div>

        {/* 2. iOS style spinner time wheel picker */}
        <div className="flex flex-col gap-2 border-t border-slate-100 pt-3">
          <span className="text-[12.5px] font-bold text-slate-700 px-1">⏰ 시간 설정</span>
          
          <div className="relative flex items-center justify-center bg-slate-50 border border-slate-200/50 rounded-2xl h-[120px] overflow-hidden py-1 px-4">
            {/* Snap Indicator Center bar */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-full h-[36px] bg-blue-500/10 border-y border-blue-500/20 pointer-events-none" />

            {/* Hour spinner */}
            <div
              ref={hourScrollRef}
              onScroll={() => handleScroll(hourScrollRef, hours, setSelectedHour)}
              className="w-1/2 h-full overflow-y-scroll snap-y snap-mandatory text-center flex flex-col scrollbar-none py-[42px]"
            >
              {hours.map((h) => (
                <div
                  key={`hr-${h}`}
                  className={`h-[36px] min-h-[36px] flex items-center justify-center snap-center text-[15px] transition-all ${
                    selectedHour === h ? "text-blue-600 font-extrabold text-[17px]" : "text-slate-400 font-semibold"
                  }`}
                >
                  {String(h).padStart(2, "0")}시
                </div>
              ))}
            </div>

            <span className="text-slate-300 font-black text-md select-none px-2">:</span>

            {/* Minute spinner */}
            <div
              ref={minuteScrollRef}
              onScroll={() => handleScroll(minuteScrollRef, minutes, setSelectedMinute)}
              className="w-1/2 h-full overflow-y-scroll snap-y snap-mandatory text-center flex flex-col scrollbar-none py-[42px]"
            >
              {minutes.map((m) => (
                <div
                  key={`min-${m}`}
                  className={`h-[36px] min-h-[36px] flex items-center justify-center snap-center text-[15px] transition-all ${
                    selectedMinute === m ? "text-blue-600 font-extrabold text-[17px]" : "text-slate-400 font-semibold"
                  }`}
                >
                  {String(m).padStart(2, "0")}분
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 3. Action Buttons */}
        <div className="flex gap-2 border-t border-slate-100 pt-3">
          {initialValue && (
            <button
              onClick={handleDelete}
              className="px-3.5 py-3.5 bg-rose-50 hover:bg-rose-100 text-rose-600 font-extrabold text-[13px] rounded-2xl flex-1 border border-rose-100 transition"
            >
              일정 삭제
            </button>
          )}
          <button
            onClick={handleSave}
            className="px-3.5 py-3.5 bg-blue-600 hover:bg-blue-700 text-white font-extrabold text-[13px] rounded-2xl flex-1 shadow-md shadow-blue-500/10 transition"
          >
            저장
          </button>
        </div>
      </div>
    </div>
  );
}
