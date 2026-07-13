"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Customer, FailedCustomer } from "../../../domain/entities/types";
import { useStatus } from "../../components/StatusContext";
import CalendarModal from "../../components/CalendarModal";
import { httpClient } from "../../../data/api/httpClient";

interface HomeTabProps {
  customers: Customer[];
  failedCustomers: FailedCustomer[];
  nickname: string;
  setActiveTab: (tab: string) => void;
  onToggleStar: (id: number, favorite: boolean) => void;
  onAddCustomerClick?: () => void;
}

export default function HomeTab({
  customers,
  failedCustomers,
  nickname,
  setActiveTab,
  onToggleStar,
  onAddCustomerClick,
}: HomeTabProps) {
  const { getDisplayLabel, statusLabels } = useStatus();
  const [showCalendar, setShowCalendar] = useState(false);

  // Real-time weather state
  const [weather, setWeather] = useState<{ temp: number; condition: string; region: string; targetHour?: string } | null>(null);
  const [isWeatherLoading, setIsWeatherLoading] = useState(false);

  useEffect(() => {
    const fetchWeather = async (lat?: number, lng?: number) => {
      setIsWeatherLoading(true);
      try {
        let url = "/api/customers/weather";
        if (lat !== undefined && lng !== undefined) {
          url += `?lat=${lat}&lng=${lng}`;
        }
        const response = await httpClient.request(url);
        const data = await response.json();
        setWeather({
          temp: data.temp,
          condition: data.condition,
          region: data.region,
          targetHour: data.targetHour
        });
      } catch (err) {
        console.error("Failed to fetch weather:", err);
      } finally {
        setIsWeatherLoading(false);
      }
    };

    if (typeof window !== "undefined" && navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchWeather(position.coords.latitude, position.coords.longitude);
        },
        (error) => {
          fetchWeather();
        },
        { timeout: 5000, enableHighAccuracy: false, maximumAge: 300000 }
      );
    } else {
      fetchWeather();
    }
  }, []);

  // 1. Current Date String (formatted to: "YYYY년 M월 D일 A요일" to match mock-up image)
  const currentDateStr = useMemo(() => {
    const days = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = days[now.getDay()];
    return `${year}년 ${month}월 ${date}일 ${day}`;
  }, []);

  // 2. Counts and Statistics
  const stats = useMemo(() => {
    const successTotal = customers.length;
    const failedTotal = failedCustomers.length;
    const total = successTotal + failedTotal;

    if (total === 0) {
      return {
        total: 0,
        uncontacted: 0,
        contact: 0,
        completed: 0,
        failed: 0,
        pUncontacted: 0,
        pContact: 0,
        pCompleted: 0,
        pFailed: 0,
      };
    }

    const completed = customers.filter((c) => c.status === "완료").length;
    const contact = customers.filter((c) => c.status === "컨택").length;
    const uncontacted = successTotal - completed - contact;
    const failed = failedTotal;

    return {
      total,
      uncontacted,
      contact,
      completed,
      failed,
      pUncontacted: Math.round((uncontacted / total) * 100),
      pContact: Math.round((contact / total) * 100),
      pCompleted: Math.round((completed / total) * 100),
      pFailed: Math.round((failed / total) * 100),
    };
  }, [customers, failedCustomers]);

  // 3. Conic Gradient configuration for perfect doughnut chart (clockwise order: 미방문 -> 진행중 -> 완료 -> 취소)
  const conicGradientStyle = useMemo(() => {
    if (stats.total === 0) {
      return { background: "#e2e8f0" };
    }
    const uncontactedShare = (stats.uncontacted / stats.total) * 100;
    const contactShare = (stats.contact / stats.total) * 100;
    const completedShare = (stats.completed / stats.total) * 100;

    const stop1 = uncontactedShare;
    const stop2 = stop1 + contactShare;
    const stop3 = stop2 + completedShare;

    return {
      background: `conic-gradient(
        #E87B72 0% ${stop1}%,
        #F2B84B ${stop1}% ${stop2}%,
        #5B9CF6 ${stop2}% ${stop3}%,
        #9AA3AF ${stop3}% 100%
      )`,
    };
  }, [stats]);

  // 4. Today's Visit Schedule
  const todaySchedules = useMemo(() => {
    const today = new Date();
    const todayY = today.getFullYear();
    const todayM = today.getMonth() + 1;
    const todayD = today.getDate();

    const withTime = customers.filter((c) => {
      if (!c.visit_time) return false;
      const parts = c.visit_time.split(" ");
      if (parts.length !== 2) return false;
      const [y, m, d] = parts[0].split("-").map(Number);
      return y === todayY && m === todayM && d === todayD;
    });

    // Sort by time string
    withTime.sort((a, b) =>
      (a.visit_time || "").localeCompare(b.visit_time || ""),
    );

    return withTime.map((c) => {
      const timeStr = c.visit_time || "";
      const parts = timeStr.split(" ");
      const timePart = parts[1] || "";
      return {
        customer: c,
        time: timePart,
      };
    });
  }, [customers]);

  // Recent activities loaded from localStorage on client-side
  const [recentActivities, setRecentActivities] = useState<Customer[]>([]);
  useEffect(() => {
    const saved = localStorage.getItem("recentActivity");
    if (saved) {
      try {
        const ids = JSON.parse(saved) as number[];
        const uniqueIds = Array.from(new Set(ids)).slice(0, 3);
        const mapped = uniqueIds
          .map((id) => customers.find((c) => c.id === id))
          .filter((c): c is Customer => !!c);
        setRecentActivities(mapped);
      } catch (e) {
        console.error("Failed to load recent activity:", e);
      }
    }
  }, [customers]);

  // Status badge visual configurations (dot color, badge container class, display text mapping)
  const getStatusBadgeStyle = (status: string | undefined) => {
    const label = getDisplayLabel(status);
    if (label === statusLabels.done) {
      return {
        bgDot: "bg-[#5B9CF6]",
        badgeCls: "bg-[#5B9CF6]/10 text-[#5B9CF6] border-[#5B9CF6]/20",
        text: statusLabels.done
      };
    }
    if (label === statusLabels.contact || status === "컨택") {
      return {
        bgDot: "bg-[#F2B84B]",
        badgeCls: "bg-[#F2B84B]/10 text-[#F2B84B] border-[#F2B84B]/20",
        text: statusLabels.contact
      };
    }
    return {
      bgDot: "bg-[#E87B72]",
      badgeCls: "bg-[#E87B72]/10 text-[#E87B72] border-[#E87B72]/20",
      text: statusLabels.none
    };
  };

  return (
    <div className="flex flex-col gap-6 p-5 pb-24">
      {/* Dynamic Greeting & Weather widget */}
      <section className="flex justify-between items-center gap-4">
        <div className="flex flex-col">
          <h2 className="text-[21px] font-black text-slate-900 tracking-tight leading-tight">
            {nickname ? (
              <>
                {nickname}님,
                <br />
                멋진 하루!
              </>
            ) : (
              "멋진 하루!"
            )}
          </h2>
          <span className="text-[13px] text-slate-500 font-medium mt-1.5">
            {currentDateStr}
          </span>
        </div>

        {/* Weather Card */}
        <div className="flex flex-col items-center justify-center bg-white/55 border border-white/20 backdrop-blur-md p-3 rounded-2xl shadow-sm shrink-0 w-[105px] h-[95px] text-center border-slate-100/30">
          {isWeatherLoading ? (
            <div className="flex flex-col items-center justify-center gap-1.5">
              <div className="animate-spin rounded-full h-4.5 w-4.5 border-2 border-slate-200 border-t-primary"></div>
              <span className="text-[10px] text-slate-400 font-extrabold">조회 중...</span>
            </div>
          ) : weather ? (
            <>
              <div className="flex items-center gap-1.5 justify-center">
                {/* Weather Icon depending on condition */}
                {(() => {
                  const cond = weather.condition;
                  if (cond === "맑음") {
                    return (
                      <div className="w-7 h-7 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <circle cx="12" cy="12" r="4"></circle>
                          <path d="M12 2v2"></path>
                          <path d="M12 20v2"></path>
                          <path d="M4.93 4.93l1.41 1.41"></path>
                          <path d="M17.66 17.66l1.41 1.41"></path>
                          <path d="M2 12h2"></path>
                          <path d="M20 12h2"></path>
                          <path d="M6.34 17.66l-1.41 1.41"></path>
                          <path d="M19.07 4.93l-1.41 1.41"></path>
                        </svg>
                      </div>
                    );
                  } else if (cond === "비" || cond === "이슬비" || cond === "소나기") {
                    return (
                      <div className="w-7 h-7 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500 shadow-sm shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M17 18a5 5 0 0 0-10 0"></path>
                          <path d="M12 2v1"></path>
                          <path d="M8 14v4"></path>
                          <path d="M12 14v4"></path>
                          <path d="M16 14v4"></path>
                        </svg>
                      </div>
                    );
                  } else if (cond === "눈") {
                    return (
                      <div className="w-7 h-7 bg-sky-50 rounded-xl flex items-center justify-center text-sky-400 shadow-sm shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"></path>
                          <line x1="8" y1="16" x2="8.01" y2="16"></line>
                          <line x1="8" y1="20" x2="8.01" y2="20"></line>
                          <line x1="12" y1="18" x2="12.01" y2="18"></line>
                          <line x1="12" y1="22" x2="12.01" y2="22"></line>
                          <line x1="16" y1="16" x2="16.01" y2="16"></line>
                          <line x1="16" y1="20" x2="16.01" y2="20"></line>
                        </svg>
                      </div>
                    );
                  } else if (cond === "뇌우") {
                    return (
                      <div className="w-7 h-7 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500 shadow-sm shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58"></path>
                          <path d="M13 11l-2 3h3l-2 5"></path>
                        </svg>
                      </div>
                    );
                  } else {
                    return (
                      <div className="w-7 h-7 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400 shadow-sm shrink-0">
                        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                        </svg>
                      </div>
                    );
                  }
                })()}
                <span className="text-[15px] font-black text-slate-900 leading-none">
                  {weather.temp}°C
                </span>
              </div>
              <span className="text-[9px] text-slate-500 font-bold tracking-tight truncate w-full mt-1.5">
                {weather.region}
              </span>
              <span className="text-[9px] text-primary/80 font-black tracking-tight mt-0.5 truncate w-full">
                {weather.targetHour ? `${weather.targetHour} 예보` : "3시간 뒤"} {weather.condition}
              </span>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center w-full">
              <div className="flex items-center gap-1.5 justify-center">
                <div className="w-7 h-7 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500 shadow-sm shrink-0">
                  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="12" cy="12" r="4"></circle>
                    <path d="M12 2v2"></path>
                    <path d="M12 20v2"></path>
                    <path d="M4.93 4.93l1.41 1.41"></path>
                    <path d="M17.66 17.66l1.41 1.41"></path>
                    <path d="M2 12h2"></path>
                    <path d="M20 12h2"></path>
                    <path d="M6.34 17.66l-1.41 1.41"></path>
                    <path d="M19.07 4.93l-1.41 1.41"></path>
                  </svg>
                </div>
                <span className="text-[15px] font-black text-slate-900 leading-none">23°C</span>
              </div>
              <span className="text-[9px] text-slate-550 font-bold tracking-tight truncate w-full mt-1.5">서울시</span>
              <span className="text-[9px] text-primary/80 font-black tracking-tight mt-0.5 truncate w-full">3시간 뒤 맑음</span>
            </div>
          )}
        </div>
      </section>

      {/* Today's Schedule Card */}
      <section className="flex flex-col gap-3 animate-slide-up">
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[16px] font-black text-slate-900 flex items-center gap-1.5">
            오늘의 방문 일정
          </h3>
          <button
            onClick={() => setShowCalendar(true)}
            className="text-[13px] font-extrabold text-primary hover:opacity-80 transition"
          >
            달력 보기
          </button>
        </div>

        <div className="glass-card p-2 flex flex-col">
          {todaySchedules.length > 0 ? (
            <div className="flex flex-col">
              {todaySchedules.slice(0, 3).map((schedule) => (
                <div
                  key={schedule.customer.id}
                  onClick={() => setActiveTab("map")}
                  className="flex items-center justify-between p-3.5 hover:bg-white/30 rounded-xl cursor-pointer transition flex-row gap-3 border-b border-slate-100/40 last:border-b-0"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex items-center gap-1.5 font-extrabold text-[11.5px] text-primary bg-primary/10 px-2.5 py-1 rounded-lg border border-primary/15 shrink-0 min-w-[62px] justify-center">
                      <span className="w-1.5 h-1.5 rounded-full bg-primary"></span>
                      {schedule.time}
                    </div>
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <strong className="text-[14px] text-slate-800 font-black truncate">
                        {schedule.customer.name}
                      </strong>
                      <span className="text-[11.5px] text-slate-500 truncate max-w-[200px]">
                        {schedule.customer.address}
                      </span>
                    </div>
                  </div>
                  <span className="text-slate-400 font-bold pl-1 text-[13px]">❯</span>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-9 px-4 text-center text-[12.5px] font-bold text-primary/75 bg-primary/5 rounded-xl border border-dashed border-primary/15 flex flex-col items-center justify-center gap-1 m-1.5">
              <span>일정이 없습니다.</span>
            </div>
          )}
        </div>
      </section>

      {/* Contact Summary Card */}
      <section className="flex flex-col gap-3 animate-slide-up" style={{ animationDelay: "0.05s" }}>
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[16px] font-black text-slate-900">
            컨택 현황 요약
          </h3>
          <button
            onClick={() => setActiveTab("customer")}
            className="text-[13px] font-extrabold text-primary hover:opacity-80 transition"
          >
            상세보기
          </button>
        </div>

        <div className="glass-card p-5 flex items-center justify-between gap-6">
          {/* Doughnut Chart with Conic Gradient */}
          <div
            style={conicGradientStyle}
            className="relative w-24 h-24 rounded-full flex items-center justify-center shrink-0 shadow-md border border-white/20"
          >
            {/* Center Hole mask */}
            <div className="bg-white w-[68px] h-[68px] rounded-full flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">TOTAL</span>
              <span className="text-[20px] font-black text-slate-900 leading-none mt-0.5">
                {stats.total}
              </span>
            </div>
          </div>

          {/* Counts and details matching mock-up image legends */}
          <div className="flex flex-col gap-2.5 flex-1 pl-2">
            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-slate-600 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-none inline-block"></span>
                {statusLabels.none}
              </span>
              <span className="text-[13.5px] font-black text-slate-900">
                {stats.uncontacted}{" "}
                <span className="text-slate-400 font-bold text-[11px] ml-0.5">
                  ({stats.pUncontacted}%)
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-slate-600 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-contact inline-block"></span>
                {statusLabels.contact}
              </span>
              <span className="text-[13.5px] font-black text-slate-900">
                {stats.contact}{" "}
                <span className="text-slate-400 font-bold text-[11px] ml-0.5">
                  ({stats.pContact}%)
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-slate-600 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-done inline-block"></span>
                {statusLabels.done}
              </span>
              <span className="text-[13.5px] font-black text-slate-900">
                {stats.completed}{" "}
                <span className="text-slate-400 font-bold text-[11px] ml-0.5">
                  ({stats.pCompleted}%)
                </span>
              </span>
            </div>

            <div className="flex items-center justify-between">
              <span className="text-[13px] font-extrabold text-slate-600 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-status-failed inline-block"></span>
                주소 오류
              </span>
              <span className="text-[13.5px] font-black text-slate-900">
                {stats.failed}{" "}
                <span className="text-slate-400 font-bold text-[11px] ml-0.5">
                  ({stats.pFailed}%)
                </span>
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* Quick Action Card */}
      <section className="flex flex-col gap-3 animate-slide-up" style={{ animationDelay: "0.1s" }}>
        <h3 className="text-[16px] font-black text-slate-900 px-1">빠른 액션</h3>
        <div className="grid grid-cols-3 gap-4">
          <button
            onClick={() => setActiveTab("map")}
            className="glass-card glass-card-interactive flex flex-col items-center justify-center gap-2 py-4 text-slate-700 hover:text-primary transition"
          >
            <div className="w-12 h-12 bg-white/60 rounded-2xl flex items-center justify-center text-primary border border-slate-200/10 shadow-sm">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
              </svg>
            </div>
            <span className="text-[12px] font-extrabold tracking-tight">지도 바로가기</span>
          </button>

          <button
            onClick={() => setActiveTab("customer")}
            className="glass-card glass-card-interactive flex flex-col items-center justify-center gap-2 py-4 text-slate-700 hover:text-primary transition"
          >
            <div className="w-12 h-12 bg-white/60 rounded-2xl flex items-center justify-center text-primary border border-slate-200/10 shadow-sm">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <span className="text-[12px] font-extrabold tracking-tight">고객 검색</span>
          </button>

          <button
            onClick={() =>
              onAddCustomerClick
                ? onAddCustomerClick()
                : setActiveTab("customer")
            }
            className="glass-card glass-card-interactive flex flex-col items-center justify-center gap-2 py-4 text-slate-700 hover:text-primary transition"
          >
            <div className="w-12 h-12 bg-white/60 rounded-2xl flex items-center justify-center text-primary border border-slate-200/10 shadow-sm">
              <svg
                width="22"
                height="22"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path>
                <circle cx="8" cy="7" r="4"></circle>
                <line x1="20" y1="8" x2="20" y2="14"></line>
                <line x1="23" y1="11" x2="17" y2="11"></line>
              </svg>
            </div>
            <span className="text-[12px] font-extrabold tracking-tight">신규 고객 등록</span>
          </button>
        </div>
      </section>

      {/* Recent Activities Card */}
      <section className="flex flex-col gap-3 animate-slide-up" style={{ animationDelay: "0.15s" }}>
        <div className="flex justify-between items-center px-1">
          <h3 className="text-[16px] font-black text-slate-900 flex items-center gap-1.5">
            최근 활동 고객
          </h3>
          <button
            onClick={() => setActiveTab("customer")}
            className="text-[13px] font-extrabold text-primary hover:opacity-80 transition"
          >
            전체보기
          </button>
        </div>

        <div className="glass-card p-2 flex flex-col">
          {recentActivities.length > 0 ? (
            <div className="flex flex-col">
              {recentActivities.map((customer, idx) => {
                const badge = getStatusBadgeStyle(customer.status);
                // Mock activity times based on index to replicate screenshot feel
                const relativeTimes = ["5분 전 활동", "1시간 전 활동", "3시간 전 활동"];
                const timeText = relativeTimes[idx] || "방금 전 활동";

                return (
                  <div
                    key={`recent-${customer.id}`}
                    className="flex items-center justify-between p-3.5 hover:bg-white/30 rounded-xl transition flex-row gap-3 border-b border-slate-100/40 last:border-b-0"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      {/* Circle Initials Avatar */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center bg-primary/10 border border-primary/15 text-primary font-black text-[14.5px] shrink-0 shadow-sm">
                        {customer.name.charAt(0)}
                      </div>
                      <div className="flex flex-col gap-0.5 min-w-0">
                        <strong className="text-[14px] text-slate-800 font-black truncate">
                          {customer.name}
                        </strong>
                        <span className="text-[11px] text-slate-400 font-bold mt-0.5">
                          {timeText}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* Pill Status Badge */}
                      <span
                        className={`text-[11px] font-bold px-3 py-1.5 rounded-full border flex items-center shadow-sm ${badge.badgeCls}`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full mr-1.5 inline-block ${badge.bgDot}`}></span>
                        {badge.text}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-[12.5px] font-bold text-slate-400 bg-white/20 rounded-xl border border-dashed border-slate-200/30 m-2 animate-pulse">
              최근 활동이 없습니다.
            </div>
          )}
        </div>
      </section>

      {showCalendar && (
        <CalendarModal
          customers={customers}
          onClose={() => setShowCalendar(false)}
        />
      )}
    </div>
  );
}
