"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Header from "@/src/presentation/components/Header";
import BottomNav from "@/src/presentation/components/BottomNav";
import Login from "@/components/Login";
import { calendarRepository } from "@/src/data/repositories/calendarApi";
import { CalendarReview } from "@/src/domain/entities/types";
import { AlertProvider, useAlert } from "@/src/presentation/components/AlertContext";
import { trackEvent } from "@/src/presentation/utils/mixpanel";

/** "2026-09-01 13:00" → "9월 1일 13:00" */
function formatStart(startAt: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2})$/.exec(startAt || "");
  if (!m) return startAt;
  return `${Number(m[2])}월 ${Number(m[3])}일 ${m[4]}:${m[5]}`;
}

function reasonText(reason: string): string {
  if (reason === "MULTIPLE") return "같은 이름의 고객이 여러 집에 있어요. 어느 집인지 골라 주세요.";
  if (reason === "NO_MATCH") return "고객 명단에 없는 이름이에요. 엑셀을 다시 올린 뒤 가져오거나, 이 일정을 무시할 수 있어요.";
  return "확인이 필요한 일정이에요.";
}

function CalendarReviewContent() {
  const router = useRouter();
  const { showAlert, showConfirm } = useAlert();
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState("");
  const [showLoginView, setShowLoginView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [items, setItems] = useState<CalendarReview[]>([]);

  const fetchItems = async () => {
    setIsLoading(true);
    try {
      setItems(await calendarRepository.getReview());
    } catch (e: unknown) {
      console.error(e);
      showAlert({
        title: "오류 발생",
        message: "확인할 일정 목록을 가져오지 못했습니다.",
        type: "error",
        debugInfo: e instanceof Error ? e.stack : String(e),
      });
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    window.scrollTo(0, 0);
    trackEvent("Page View", { page: "/calendar-review" });
  }, []);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedNickname = localStorage.getItem("nickname");
    if (token) {
      setIsLoggedIn(true);
      if (storedNickname) setNickname(storedNickname);
      fetchItems();
    } else {
      setIsLoading(false);
      setShowLoginView(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn]);

  const handleResolve = async (item: CalendarReview, customerId: number, address: string) => {
    setBusyId(item.visit_id);
    try {
      const ok = await calendarRepository.resolveReview(item.visit_id, customerId);
      if (ok) {
        trackEvent("Calendar Review Resolve", { visit_id: item.visit_id, reason: item.reason });
        showAlert({
          title: "일정 등록 완료",
          message: `${item.customer_name} 고객님 ${formatStart(item.start_at)} 방문이 ${address}에 등록되었습니다.`,
          type: "success",
        });
        fetchItems();
      } else {
        showAlert({ title: "등록 실패", message: "일정을 등록하지 못했습니다.", type: "warning" });
      }
    } catch (e: unknown) {
      console.error(e);
      showAlert({ title: "오류 발생", message: "서버 통신 중 오류가 발생했습니다.", type: "error", debugInfo: e instanceof Error ? e.stack : String(e) });
    } finally {
      setBusyId(null);
    }
  };

  const handleIgnore = (item: CalendarReview) => {
    showConfirm({
      title: "일정 무시",
      message: `${item.customer_name} 고객님 ${formatStart(item.start_at)} 일정을 목록에서 뺄까요?\n캘린더의 일정은 그대로 남습니다.`,
      confirmText: "무시",
      onConfirm: async () => {
        setBusyId(item.visit_id);
        try {
          const ok = await calendarRepository.ignoreReview(item.visit_id);
          if (ok) {
            trackEvent("Calendar Review Ignore", { visit_id: item.visit_id, reason: item.reason });
            fetchItems();
          }
        } catch (e: unknown) {
          console.error(e);
          showAlert({ title: "오류 발생", message: "서버 통신 중 오류가 발생했습니다.", type: "error" });
        } finally {
          setBusyId(null);
        }
      },
    });
  };

  const handleTabChange = (tab: string) => {
    router.push(`/?tab=${tab}`);
  };

  if (showLoginView) {
    return (
      <div className="relative">
        <button
          onClick={() => {
            setShowLoginView(false);
            router.push("/");
          }}
          className="absolute top-5 left-5 z-50 text-[13px] font-extrabold text-slate-500 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/50 hover:bg-slate-50 transition shadow-sm"
        >
          ← 뒤로가기
        </button>
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen app-pastel-bg flex flex-col max-w-md mx-auto relative shadow-2xl overflow-x-hidden border-x border-slate-100/60 pb-32">
      <Header isLoggedIn={isLoggedIn} nickname={nickname} onLoginClick={() => setShowLoginView(true)} />

      <main className="flex-1 w-full bg-transparent px-5 pt-6 space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button
              onClick={() => router.push("/?tab=settings")}
              className="w-8 h-8 rounded-full bg-white/60 border border-slate-200/50 flex items-center justify-center text-slate-600 active:scale-90 transition-transform shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 className="text-[19px] font-extrabold text-slate-800 tracking-tight">캘린더 일정 확인</h1>
          </div>
          <button onClick={fetchItems} className="p-2 rounded-full hover:bg-white/30 text-slate-500 transition-colors" aria-label="새로고침">
            <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>

        <section className="glass-card p-4">
          <p className="text-[12.5px] font-bold text-slate-600 leading-relaxed">
            캘린더에서 가져왔지만 자동으로 연결하지 못한 일정입니다. 이름이 같은 집이 여럿이거나 명단에 없는 이름이면 여기로 옵니다.
          </p>
          <p className="text-[11px] font-semibold text-slate-450 mt-1.5">확인 필요 {items.length}건</p>
        </section>

        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[12px] font-bold">목록을 불러오는 중...</p>
            </div>
          ) : items.length === 0 ? (
            <div className="text-center py-16 bg-white/20 rounded-3xl border border-dashed border-slate-300/60 text-slate-400 flex flex-col items-center justify-center gap-1">
              <p className="text-[13px] font-extrabold text-slate-500">확인할 일정이 없습니다</p>
              <p className="text-[11.5px] font-semibold">가져온 일정은 모두 고객과 연결됐어요.</p>
            </div>
          ) : (
            items.map((item) => {
              const busy = busyId === item.visit_id;
              return (
                <div key={item.visit_id} className="glass-card p-5 flex flex-col gap-3.5 animate-slide-up">
                  <div className="flex items-center justify-between">
                    <span className="text-[12.5px] font-bold text-slate-800 bg-slate-200/50 px-2 py-0.5 rounded-md">
                      {item.customer_name} 고객
                    </span>
                    <span className="text-[12px] font-extrabold text-primary">{formatStart(item.start_at)}</span>
                  </div>
                  <p className="text-[12.5px] text-slate-500 font-semibold leading-relaxed">{reasonText(item.reason)}</p>

                  {item.candidates.length > 0 && (
                    <div className="flex flex-col gap-2">
                      {item.candidates.map((cand) => (
                        <button
                          key={cand.customer_id}
                          disabled={busy}
                          onClick={() => handleResolve(item, cand.customer_id, cand.address)}
                          className="flex items-center justify-between text-left bg-white/60 px-3 py-2.5 rounded-xl border border-slate-200/30 hover:border-primary/20 transition-all group disabled:opacity-50"
                        >
                          <span className="text-[13px] font-medium text-slate-700 group-hover:text-primary transition-colors pr-2 break-all">
                            {cand.address}
                          </span>
                          <span className="text-[11px] font-extrabold text-primary shrink-0">이 집으로</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="flex items-center justify-between border-t border-slate-200/20 pt-3">
                    <span className="text-[10.5px] font-semibold text-slate-400">요청번호 {item.request_no}</span>
                    <button
                      disabled={busy}
                      onClick={() => handleIgnore(item)}
                      className="glass-card bg-white/40 hover:bg-white/70 border border-slate-200/30 text-slate-600 text-[12px] font-extrabold px-3.5 h-8.5 rounded-xl shadow-sm active:scale-95 transition-transform disabled:opacity-50"
                    >
                      무시
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      <BottomNav activeTab="settings" setActiveTab={handleTabChange} />
    </div>
  );
}

export default function CalendarReviewPage() {
  return (
    <AlertProvider>
      <CalendarReviewContent />
    </AlertProvider>
  );
}
