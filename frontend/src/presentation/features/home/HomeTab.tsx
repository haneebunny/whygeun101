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
  const [weather, setWeather] = useState<{ temp: number; condition: string; region: string } | null>(null);
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
          region: data.region
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
          console.warn("Geolocation failed or denied, fetching default weather:", error);
          fetchWeather();
        },
        { timeout: 10000 }
      );
    } else {
      fetchWeather();
    }
  }, []);

  // 1. Current Date String
  const currentDateStr = useMemo(() => {
    const days = ["일", "월", "화", "수", "목", "금", "토"];
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1;
    const date = now.getDate();
    const day = days[now.getDay()];
    return `${year}년 ${month}월 ${date}일 (${day})`;
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

    // Direct proportional calculation of percentage ensuring it sums up to 100
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

  // 3. Conic Gradient configuration for perfect doughnut chart (zero overlaps)
  const conicGradientStyle = useMemo(() => {
    if (stats.total === 0) {
      return { background: "#e2e8f0" };
    }
    const completedShare = (stats.completed / stats.total) * 100;
    const contactShare = (stats.contact / stats.total) * 100;
    const uncontactedShare = (stats.uncontacted / stats.total) * 100;
    const failedShare = (stats.failed / stats.total) * 100;

    const stop1 = completedShare;
    const stop2 = stop1 + contactShare;
    const stop3 = stop2 + uncontactedShare;

    return {
      background: `conic-gradient(
        #3b82f6 0% ${stop1}%,
        #eab308 ${stop1}% ${stop2}%,
        #ef4444 ${stop2}% ${stop3}%,
        #94a3b8 ${stop3}% 100%
      )`,
    };
  }, [stats]);

  // 4. Today's Visit Schedule (filtered ONLY by customers having explicit visitTime on today's date, sorted chronologically)
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

  // 5. Starred Customers list
  const starredCustomers = useMemo(() => {
    return customers.filter((c) => c.favorite).slice(0, 3);
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

  return (
    <div className="flex flex-col gap-6 p-5 pb-24">
      {/* Dynamic Greeting & Weather widget */}
      <section className="flex justify-between items-center gap-4">
        <div className="flex flex-col gap-1">
          <h2 className="text-xl font-bold text-slate-800 tracking-tight leading-tight">
            {nickname ? nickname : "방문자"}님, 멋진 하루!
          </h2>
          <span className="text-[13px] text-slate-400 font-semibold">
            {currentDateStr}
          </span>
        </div>

        {/* Weather Card */}
        <div className="flex items-center gap-2.5 bg-white/70 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-sm border border-slate-100/60 shrink-0 min-w-[120px] justify-center">
          {isWeatherLoading ? (
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-2 border-slate-200 border-t-slate-500"></div>
              <span className="text-[11px] text-slate-400 font-semibold">정보 수신중...</span>
            </div>
          ) : weather ? (
            <>
              {/* Weather Icon depending on condition */}
              {(() => {
                const cond = weather.condition;
                if (cond === "맑음") {
                  return (
                    <div className="w-9 h-9 bg-amber-50 rounded-xl flex items-center justify-center text-amber-500">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                    <div className="w-9 h-9 bg-blue-50 rounded-xl flex items-center justify-center text-blue-500">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                    <div className="w-9 h-9 bg-sky-50 rounded-xl flex items-center justify-center text-sky-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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
                    <div className="w-9 h-9 bg-purple-50 rounded-xl flex items-center justify-center text-purple-500">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M19 16.9A5 5 0 0 0 18 7h-1.26a8 8 0 1 0-11.62 8.58"></path>
                        <path d="M13 11l-2 3h3l-2 5"></path>
                      </svg>
                    </div>
                  );
                } else {
                  return (
                    <div className="w-9 h-9 bg-slate-50 rounded-xl flex items-center justify-center text-slate-400">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"></path>
                      </svg>
                    </div>
                  );
                }
              })()}
              <div className="flex flex-col text-right">
                <span className="text-[14px] font-extrabold text-slate-800">
                  {weather.temp}°C
                </span>
                <span className="text-[9px] text-slate-400 font-bold whitespace-nowrap">
                  {weather.region} | {weather.condition}
                </span>
              </div>
            </>
          ) : (
            <div className="flex flex-col text-right">
              <span className="text-[14px] font-extrabold text-slate-800">23°C</span>
              <span className="text-[10px] text-slate-400 font-bold">서울 | 맑음</span>
            </div>
          )}
        </div>
      </section>

      {/* Today's Schedule Card */}
      <section className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2">
            <span className="text-blue-500">📅</span> 오늘의 방문 일정{" "}
            <span className="text-slate-400 font-semibold text-[13px]">
              (총 {todaySchedules.length}건)
            </span>
          </h3>
          <button
            onClick={() => setShowCalendar(true)}
            className="text-[12px] font-bold text-slate-400 hover:text-blue-600 transition flex items-center gap-0.5"
          >
            달력 보기 <span className="text-[10px]">📅</span>
          </button>
        </div>

        {todaySchedules.length > 0 ? (
          <div className="flex flex-col gap-3">
            {todaySchedules.slice(0, 3).map((schedule) => (
              <div
                key={schedule.customer.id}
                onClick={() => setActiveTab("map")}
                className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl cursor-pointer border border-slate-100/50 transition flex-row gap-3"
              >
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-1.5 font-bold text-[11.5px] text-blue-600 bg-blue-50/70 px-2.5 py-1 rounded-lg border border-blue-100/30 shrink-0">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span>
                    {schedule.time}
                  </div>
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <strong className="text-[13.5px] text-slate-800 font-bold truncate">
                      {schedule.customer.name} 고객
                    </strong>
                    <span className="text-[11.5px] text-slate-400 truncate max-w-[180px]">
                      {schedule.customer.address}
                    </span>
                  </div>
                </div>
                <span className="text-slate-300 font-bold">❯</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="py-9 px-4 text-center text-[13px] font-bold text-blue-500 bg-blue-50/20 rounded-2xl border border-dashed border-blue-200/50 flex flex-col items-center justify-center gap-1">
            <span>오늘은 한가하네요! 일정이 없습니다🫥</span>
          </div>
        )}
      </section>

      {/* Contact Summary Card */}
      <section className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2">
            <span className="text-emerald-500">⏱️</span> 컨택 현황 요약
          </h3>
          <button
            onClick={() => setActiveTab("customer")}
            className="text-[12px] font-bold text-slate-400 hover:text-blue-600 transition flex items-center gap-0.5"
          >
            상세보기 <span className="text-[10px]">▶</span>
          </button>
        </div>

        <div className="flex items-center justify-between gap-6 py-2">
          {/* Doughnut Chart with Conic Gradient */}
          <div
            style={conicGradientStyle}
            className="relative w-24 h-24 rounded-full flex items-center justify-center shrink-0 shadow-sm border border-slate-100/30"
          >
            {/* Center Hole mask */}
            <div className="bg-white w-[68px] h-[68px] rounded-full flex flex-col items-center justify-center text-center shadow-inner">
              <span className="text-[10px] text-slate-400 font-bold">전체</span>
              <span className="text-[16px] font-black text-slate-800 leading-none mt-0.5">
                {stats.total}
              </span>
            </div>
          </div>

          {/* Counts and details */}
          <div className="flex flex-col gap-2 flex-1">
            <div className="flex items-center justify-between bg-rose-50/40 px-3 py-1.5 rounded-xl border border-rose-100/20">
              <span className="text-[12px] font-bold text-slate-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 inline-block"></span>
                {statusLabels.none}
              </span>
              <span className="text-[12.5px] font-extrabold text-slate-800">
                {stats.uncontacted}개{" "}
                <span className="text-slate-400 font-semibold text-[10.5px]">
                  ({stats.pUncontacted}%)
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between bg-amber-50/40 px-3 py-1.5 rounded-xl border border-amber-100/20">
              <span className="text-[12px] font-bold text-slate-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block"></span>
                {statusLabels.contact}
              </span>
              <span className="text-[12.5px] font-extrabold text-slate-800">
                {stats.contact}개{" "}
                <span className="text-slate-400 font-semibold text-[10.5px]">
                  ({stats.pContact}%)
                </span>
              </span>
            </div>
            <div className="flex items-center justify-between bg-blue-50/40 px-3 py-1.5 rounded-xl border border-blue-100/20">
              <span className="text-[12px] font-bold text-slate-500 flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-blue-500 inline-block"></span>
                {statusLabels.done}
              </span>
              <span className="text-[12.5px] font-extrabold text-slate-800">
                {stats.completed}개{" "}
                <span className="text-slate-400 font-semibold text-[10.5px]">
                  ({stats.pCompleted}%)
                </span>
              </span>
            </div>
            {stats.failed > 0 && (
              <div className="flex items-center justify-between bg-slate-50 px-3 py-1.5 rounded-xl border border-slate-200/40">
                <span className="text-[12px] font-bold text-slate-500 flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block"></span>
                  주소 오류
                </span>
                <span className="text-[12.5px] font-extrabold text-slate-800">
                  {stats.failed}개{" "}
                  <span className="text-slate-400 font-semibold text-[10.5px]">
                    ({stats.pFailed}%)
                  </span>
                </span>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Quick Action Card */}
      <section className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-4 flex flex-col gap-3">
        <h3 className="text-[15px] font-extrabold text-slate-800">빠른 액션</h3>
        <div className="grid grid-cols-3 gap-3">
          <button
            onClick={() => setActiveTab("map")}
            className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50/70 hover:bg-blue-50/40 rounded-2xl border border-slate-100/50 hover:border-blue-100/50 text-slate-700 hover:text-blue-600 transition"
          >
            <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-blue-500 border border-slate-100/20">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
              </svg>
            </div>
            <span className="text-[11.5px] font-bold">지도 바로가기</span>
          </button>

          <button
            onClick={() => setActiveTab("customer")}
            className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50/70 hover:bg-blue-50/40 rounded-2xl border border-slate-100/50 hover:border-blue-100/50 text-slate-700 hover:text-blue-600 transition"
          >
            <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-emerald-500 border border-slate-100/20">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.2"
              >
                <circle cx="11" cy="11" r="8"></circle>
                <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
              </svg>
            </div>
            <span className="text-[11.5px] font-bold">고객 검색</span>
          </button>

          <button
            onClick={() =>
              onAddCustomerClick
                ? onAddCustomerClick()
                : setActiveTab("customer")
            }
            className="flex flex-col items-center justify-center gap-2 py-4 bg-slate-50/70 hover:bg-blue-50/40 rounded-2xl border border-slate-100/50 hover:border-blue-100/50 text-slate-700 hover:text-blue-600 transition"
          >
            <div className="w-10 h-10 bg-white shadow-sm rounded-xl flex items-center justify-center text-purple-500 border border-slate-100/20">
              <svg
                width="20"
                height="20"
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
            <span className="text-[11.5px] font-bold">신규 고객 등록</span>
          </button>
        </div>
      </section>

      {/* Recent Activities Card */}
      <section className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-4 flex flex-col gap-4">
        <div className="flex justify-between items-center">
          <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-2">
            <span className="text-blue-500">⏱️</span> 최근 활동 고객
          </h3>
          <button
            onClick={() => setActiveTab("customer")}
            className="text-[12px] font-bold text-slate-400 hover:text-blue-600 transition flex items-center gap-0.5"
          >
            전체보기 <span className="text-[10px]">▶</span>
          </button>
        </div>

        {recentActivities.length > 0 ? (
          <div className="flex flex-col gap-3">
            {recentActivities.map((customer) => {
              let statusBg = "bg-rose-500";
              let badgeStyle = "bg-rose-50 text-rose-600 border-rose-100/30";

              if (customer.status === "컨택") {
                statusBg = "bg-amber-500";
                badgeStyle = "bg-amber-50 text-amber-600 border-amber-100/30";
              } else if (customer.status === "완료") {
                statusBg = "bg-blue-500";
                badgeStyle = "bg-blue-50 text-blue-600 border-blue-100/30";
              }

              return (
                <div
                  key={`recent-${customer.id}`}
                  className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/50 transition flex-row gap-3"
                >
                  <div className="flex flex-col gap-0.5 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <strong className="text-[13.5px] text-slate-800 font-extrabold truncate">
                        {customer.name} 고객
                      </strong>
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md border ${badgeStyle}`}
                      >
                        {getDisplayLabel(customer.status)}
                      </span>
                    </div>
                    <span className="text-[11.5px] text-slate-400 truncate max-w-[260px] mt-0.5">
                      {customer.address}
                    </span>
                  </div>

                  <button
                    onClick={() =>
                      onToggleStar(customer.id, !customer.favorite)
                    }
                    className="text-amber-400 hover:scale-110 active:scale-95 transition p-1"
                  >
                    {customer.favorite ? "★" : "☆"}
                  </button>
                </div>
              );
            })}
          </div>
        ) : (
          <div className="py-8 text-center text-[12.5px] text-slate-400 bg-slate-50/30 rounded-xl border border-dashed border-slate-100">
            최근 활동이 없습니다.
          </div>
        )}
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
