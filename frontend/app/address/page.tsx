"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "@/src/presentation/components/Header";
import BottomNav from "@/src/presentation/components/BottomNav";
import Login from "@/components/Login";
import { customerRepository } from "@/src/data/repositories/customerApi";
import { AddressCorrection } from "@/src/domain/entities/types";
import { AlertProvider, useAlert } from "@/src/presentation/components/AlertContext";

function AddressCorrectionContent() {
  const router = useRouter();
  const { showAlert, showConfirm } = useAlert();

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [nickname, setNickname] = useState("");
  const [showLoginView, setShowLoginView] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isActionLoading, setIsActionLoading] = useState(false);

  const [corrections, setCorrections] = useState<AddressCorrection[]>([]);
  const [unprocessedOnly, setUnprocessedOnly] = useState(true);
  const [sortByConfidence, setSortByConfidence] = useState(true); // true: 신뢰도 높은 순, false: 신뢰도 낮은 순

  // 상세 보정 모달 상태
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedCorrection, setSelectedCorrection] = useState<AddressCorrection | null>(null);
  const [customAddress, setCustomAddress] = useState("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedNickname = localStorage.getItem("nickname");
    if (token) {
      setIsLoggedIn(true);
      if (storedNickname) setNickname(storedNickname);
      fetchCorrections();
    } else {
      setIsLoading(false);
      setShowLoginView(true);
    }
  }, [isLoggedIn]);

  const fetchCorrections = async () => {
    setIsLoading(true);
    try {
      const data = await customerRepository.getAddressCorrections();
      setCorrections(data || []);
    } catch (e: any) {
      console.error(e);
      showAlert({
        title: "오류 발생",
        message: "주소 보정 대상 데이터를 가져오는데 실패했습니다.",
        type: "error",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 신뢰도 높음 주소 일괄 자동 보정 적용
  const handleBulkApply = async () => {
    const highConfidenceCount = corrections.filter(c => 
      c.candidates && c.candidates.some(cand => cand.confidence.toUpperCase() === "HIGH")
    ).length;

    if (highConfidenceCount === 0) {
      showAlert({
        title: "일괄 적용 대상 없음",
        message: "현재 일괄 적용할 수 있는 신뢰도 '높음' 후보가 존재하지 않습니다.",
        type: "warning",
      });
      return;
    }

    showConfirm({
      title: "일괄 자동 보정",
      message: `신뢰도가 높은 ${highConfidenceCount}건의 주소를 자동으로 보정하여 확정하시겠습니까?`,
      confirmText: "보정 적용",
      onConfirm: async () => {
        setIsActionLoading(true);
        try {
          const result = await customerRepository.applyCorrectionsBulk();
          if (result) {
            showAlert({
              title: "일괄 적용 성공",
              message: `${result.updated_count}건의 주소가 성공적으로 보정되었습니다.`,
              type: "success",
            });
            fetchCorrections();
          }
        } catch (e: any) {
          console.error(e);
          showAlert({
            title: "보정 실패",
            message: "일괄 자동 보정 처리 도중 서버 에러가 발생했습니다.",
            type: "error",
          });
        } finally {
          setIsActionLoading(false);
        }
      }
    });
  };

  // 개별 주소 확정
  const handleApplySingle = async (customerId: number, address: string) => {
    setIsActionLoading(true);
    try {
      const result = await customerRepository.updateAddress(customerId, address);
      if (result.success) {
        showAlert({
          title: "주소 확정 완료",
          message: "선택하신 주소로 정상 보정되어 지도 핀이 생성되었습니다.",
          type: "success",
        });
        fetchCorrections();
      } else {
        showAlert({
          title: "주소 보정 실패",
          message: "해당 주소의 위경도 좌표를 변환하지 못했습니다. 다른 주소를 시도해주세요.",
          type: "warning",
        });
      }
    } catch (e: any) {
      console.error(e);
      showAlert({
        title: "오류 발생",
        message: "주소 확정 도중 예외가 발생했습니다.",
        type: "error",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // 상세 직접 보정 제출
  const handleCustomAddressSubmit = async () => {
    if (!selectedCorrection) return;
    if (!customAddress.trim()) {
      showAlert({
        title: "입력 오류",
        message: "주소를 올바르게 입력해주세요.",
        type: "warning",
      });
      return;
    }

    setIsActionLoading(true);
    try {
      const result = await customerRepository.updateAddress(selectedCorrection.customer_id, customAddress.trim());
      if (result.success) {
        showAlert({
          title: "보정 성공",
          message: "직접 입력하신 주소로 보정이 완료되었습니다.",
          type: "success",
        });
        setShowDetailModal(false);
        fetchCorrections();
      } else {
        showAlert({
          title: "보정 실패",
          message: "입력된 주소로 위경도 좌표를 찾을 수 없습니다. 도로명과 건물 번호가 정확한지 확인해주세요.",
          type: "warning",
        });
      }
    } catch (e: any) {
      console.error(e);
      showAlert({
        title: "오류 발생",
        message: "서버 통신 도중 오류가 발생했습니다.",
        type: "error",
      });
    } finally {
      setIsActionLoading(false);
    }
  };

  // 상세 보정 모달 열기
  const openDetailModal = (corr: AddressCorrection) => {
    setSelectedCorrection(corr);
    // 가장 높은 확률의 후보 주소를 기본값으로 세팅해둠
    const defaultVal = corr.candidates && corr.candidates.length > 0 
      ? corr.candidates[0].refined_address 
      : corr.original_address;
    setCustomAddress(defaultVal);
    setShowDetailModal(true);
  };

  // 정렬 및 필터 적용된 데이터 리스트 생성
  const getFilteredCorrections = () => {
    let list = [...corrections];

    // 1. 미처리만 보기 (후보가 남아있는 건들)
    if (unprocessedOnly) {
      list = list.filter(c => c.candidates && c.candidates.length > 0);
    }

    // 2. 신뢰도 기준 정렬
    list.sort((a, b) => {
      const getHighestConfidenceScore = (corr: AddressCorrection) => {
        if (!corr.candidates || corr.candidates.length === 0) return 0;
        const conf = corr.candidates[0].confidence.toUpperCase();
        if (conf === "HIGH") return 3;
        if (conf === "MEDIUM") return 2;
        return 1;
      };

      const scoreA = getHighestConfidenceScore(a);
      const scoreB = getHighestConfidenceScore(b);

      return sortByConfidence ? scoreB - scoreA : scoreA - scoreB;
    });

    return list;
  };

  // 통계 계산
  const totalCount = corrections.length;
  const autoCorrectCount = corrections.filter(c => 
    c.candidates && c.candidates.some(cand => cand.confidence.toUpperCase() === "HIGH")
  ).length;
  const reviewRequiredCount = totalCount - autoCorrectCount;

  // 탭 이동 처리 (BottomNav 연동)
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
      <Header
        isLoggedIn={isLoggedIn}
        nickname={nickname}
        onLoginClick={() => setShowLoginView(true)}
      />

      <main className="flex-1 w-full bg-transparent px-5 pt-6 space-y-6">
        {/* 상단 타이틀 및 뒤로가기 */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => router.push("/?tab=customer")}
              className="w-8 h-8 rounded-full bg-white/60 border border-slate-200/50 flex items-center justify-center text-slate-600 active:scale-90 transition-transform shadow-sm"
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="12" x2="5" y2="12"></line>
                <polyline points="12 19 5 12 12 5"></polyline>
              </svg>
            </button>
            <h1 className="text-[19px] font-extrabold text-slate-800 tracking-tight">주소 보정</h1>
          </div>
          <button 
            onClick={fetchCorrections}
            className="p-2 rounded-full hover:bg-white/30 text-slate-500 transition-colors"
          >
            <svg className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99" />
            </svg>
          </button>
        </div>

        {/* 1. Summary Bar */}
        <section className="glass-card p-4">
          <div className="grid grid-cols-3 divide-x divide-slate-200/50">
            <div className="flex flex-col items-center justify-center">
              <span className="text-[11.5px] font-bold text-slate-500 mb-0.5">전체 실패</span>
              <span className="text-[17px] font-extrabold text-slate-800">{totalCount}건</span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <span className="text-[11.5px] font-bold text-slate-500 mb-0.5">자동 보정</span>
              <span className="text-[17px] font-extrabold text-primary">{autoCorrectCount}건</span>
            </div>
            <div className="flex flex-col items-center justify-center">
              <span className="text-[11.5px] font-bold text-slate-500 mb-0.5">확인 필요</span>
              <span className="text-[17px] font-extrabold text-rose-500">{reviewRequiredCount}건</span>
            </div>
          </div>
        </section>

        {/* 2. Primary Action Button */}
        <button
          onClick={handleBulkApply}
          disabled={isLoading || isActionLoading || autoCorrectCount === 0}
          className={`w-full h-12 bg-white/40 backdrop-blur-md text-primary font-extrabold text-[13.5px] rounded-2xl border border-primary/20 shadow-sm active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5 ${
            autoCorrectCount === 0 ? "opacity-50 cursor-not-allowed" : "hover:bg-white/60"
          }`}
        >
          <span className="material-symbols-outlined text-[19px] fill-current">bolt</span>
          신뢰도 높음 {autoCorrectCount}건 한 번에 적용
        </button>

        {/* 3. Filters */}
        <div className="flex items-center justify-between text-slate-600">
          <div className="flex items-center gap-2">
            <span className="text-[12.5px] font-bold">미처리만 보기</span>
            <button
              onClick={() => setUnprocessedOnly(!unprocessedOnly)}
              className={`w-10 h-5.5 rounded-full p-0.5 transition-colors relative ${unprocessedOnly ? "bg-primary" : "bg-slate-300"}`}
            >
              <div className={`w-4.5 h-4.5 bg-white rounded-full transition-transform shadow-sm transform ${unprocessedOnly ? "translate-x-4.5" : "translate-x-0"}`}></div>
            </button>
          </div>
          <button
            onClick={() => setSortByConfidence(!sortByConfidence)}
            className="flex items-center gap-1 text-[12px] font-bold bg-white/40 px-3 py-1 rounded-full border border-slate-200/50 shadow-sm hover:bg-white/60 transition-colors"
          >
            {sortByConfidence ? "신뢰도 높은 순" : "신뢰도 낮은 순"}
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
            </svg>
          </button>
        </div>

        {/* 4. Correction Card List */}
        <div className="space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
              <p className="text-[12px] font-bold">AI가 지저분한 주소들을 정밀 분석하고 있습니다...</p>
            </div>
          ) : getFilteredCorrections().length === 0 ? (
            <div className="text-center py-16 bg-white/20 rounded-3xl border border-dashed border-slate-300/60 text-slate-400">
              <span className="material-symbols-outlined text-[36px] opacity-40 mb-1">location_off</span>
              <p className="text-[13px] font-bold">보정이 필요한 주소 정보가 없습니다.</p>
            </div>
          ) : (
            getFilteredCorrections().map((corr) => {
              const hasCandidates = corr.candidates && corr.candidates.length > 0;
              return (
                <div
                  key={corr.customer_id}
                  className="glass-card p-5 flex flex-col space-y-4 animate-slide-up"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span className="text-[12.5px] font-bold text-slate-800 bg-slate-200/50 px-2 py-0.5 rounded-md">{corr.name} 고객</span>
                      <span className="text-[10px] text-slate-400 font-medium">실패 주소</span>
                    </div>
                    <p className="text-[13.5px] text-slate-400 line-through font-medium mt-1.5 pl-0.5">{corr.original_address}</p>
                    
                    <div className="flex items-start gap-2 mt-3.5">
                      <span className="material-symbols-outlined text-primary/40 text-[18px] mt-1.5 rotate-90">subdirectory_arrow_right</span>
                      <div className="flex flex-col gap-2 w-full">
                        {hasCandidates ? (
                          corr.candidates.map((cand, idx) => {
                            const isHigh = cand.confidence.toUpperCase() === "HIGH";
                            const isMedium = cand.confidence.toUpperCase() === "MEDIUM";
                            const badgeBg = isHigh ? "bg-emerald-500/15 text-emerald-600 border-emerald-500/20" : isMedium ? "bg-amber-500/15 text-amber-600 border-amber-500/20" : "bg-slate-400/15 text-slate-500 border-slate-400/20";
                            const badgeText = isHigh ? "높음" : isMedium ? "중간" : "낮음";

                            return (
                              <div
                                key={idx}
                                className="flex items-center justify-between bg-white/60 px-3 py-2.5 rounded-xl border border-slate-200/30 hover:border-primary/20 transition-all cursor-pointer group"
                                onClick={() => handleApplySingle(corr.customer_id, cand.refined_address)}
                              >
                                <span className="text-[13px] font-medium text-slate-700 group-hover:text-primary transition-colors">{cand.refined_address}</span>
                                <span className={`px-2 py-0.5 rounded-full border text-[10px] font-extrabold ${badgeBg}`}>
                                  {badgeText}
                                </span>
                              </div>
                            );
                          })
                        ) : (
                          <div className="text-[12.5px] text-rose-500 font-bold bg-rose-500/10 px-3 py-2.5 rounded-xl border border-rose-500/20">
                            AI 분석 결과 일치하는 유효 주소 후보가 없습니다. 직접 보정해 주세요.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-end gap-1.5 border-t border-slate-200/20 pt-3">
                    <button
                      onClick={() => openDetailModal(corr)}
                      className="glass-card bg-white/40 hover:bg-white/70 border border-slate-200/30 text-primary text-[12px] font-extrabold px-3.5 h-8.5 rounded-xl shadow-sm active:scale-95 transition-transform"
                    >
                      상세 직접보정
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* 바닥 유도 가이드 */}
        <div className="flex flex-col items-center gap-1.5 py-8 opacity-45">
          <span className="material-symbols-outlined text-[28px] text-slate-400">touch_app</span>
          <p className="text-[11.5px] font-bold text-slate-500">후보 주소를 터치하여 간편하게 확정할 수 있습니다.</p>
        </div>
      </main>

      {/* 5. 상세 주소 직접 보정 모달 */}
      {showDetailModal && selectedCorrection && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-slate-900/40 backdrop-blur-[4px] animate-fade-in">
          <div className="bg-white/95 backdrop-blur-xl w-full max-w-sm p-6 rounded-3xl border border-slate-100 shadow-2xl flex flex-col gap-4 animate-scale-up">
            <div>
              <h3 className="text-[15.5px] font-black text-slate-800">📍 상세 직접 보정</h3>
              <p className="text-[11px] text-slate-400 mt-0.5">카카오 검색이 가능하도록 표준 주소(동/호수 제외)를 기입해 주세요.</p>
            </div>

            <div className="space-y-3">
              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                <span className="text-[10px] font-bold text-slate-400">잘못된 원본 주소</span>
                <p className="text-[12.5px] font-medium text-slate-500 mt-0.5">{selectedCorrection.original_address}</p>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-500 mb-1 block pl-0.5">보정할 주소 입력</label>
                <input
                  type="text"
                  value={customAddress}
                  onChange={(e) => setCustomAddress(e.target.value)}
                  placeholder="예: 서울시 강남구 테헤란로 123"
                  className="w-full h-11 px-3 bg-slate-50 text-[13.5px] font-medium rounded-xl border border-slate-200 focus:outline-none focus:border-primary transition-all"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 mt-2">
              <button
                onClick={() => setShowDetailModal(false)}
                className="px-4.5 h-10 bg-slate-100 hover:bg-slate-200 text-slate-600 text-[12.5px] font-extrabold rounded-xl transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleCustomAddressSubmit}
                className="px-5 h-10 bg-primary hover:bg-primary/95 text-white text-[12.5px] font-extrabold rounded-xl shadow-sm active:scale-95 transition-transform"
              >
                보정 완료
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 액션 스피너 백드롭 */}
      {isActionLoading && (
        <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-slate-900/10 backdrop-blur-[1px]">
          <div className="bg-white/90 p-5 rounded-2xl shadow-xl flex items-center gap-3 border border-slate-100">
            <div className="w-7 h-7 border-3 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span className="text-[12.5px] font-extrabold text-slate-800">주소를 보정하고 있습니다...</span>
          </div>
        </div>
      )}

      <BottomNav activeTab="customer" setActiveTab={handleTabChange} />
    </div>
  );
}

export default function AddressCorrectionPage() {
  return (
    <AlertProvider>
      <AddressCorrectionContent />
    </AlertProvider>
  );
}
