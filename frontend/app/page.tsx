"use client";

import React, { useState, useEffect } from "react";
import Header from "@/src/presentation/components/Header";
import BottomNav from "@/src/presentation/components/BottomNav";
import Login from "@/components/Login";
import HomeTab from "@/src/presentation/features/home/HomeTab";
import MapTab from "@/src/presentation/features/map/MapTab";
import CustomerTab from "@/src/presentation/features/customer/CustomerTab";
import SettingsTab from "@/src/presentation/features/settings/SettingsTab";

import { customerRepository } from "@/src/data/repositories/customerApi";
import { Customer, FailedCustomer } from "@/src/domain/entities/types";
import { StatusProvider } from "@/src/presentation/components/StatusContext";
import {
  AlertProvider,
  useAlert,
} from "@/src/presentation/components/AlertContext";
import AddCustomerModal from "@/src/presentation/components/AddCustomerModal";
import { identifyUser, resetUser, trackEvent } from "@/src/presentation/utils/mixpanel";

function PageContent() {
  const BACKEND_IP = process.env.NEXT_PUBLIC_API_URL || "";
  const { showAlert, showConfirm } = useAlert();

  const [activeTab, setActiveTab] = useState<string>("home");
  const [successCustomers, setSuccessCustomers] = useState<Customer[]>([]);
  const [failedCustomers, setFailedCustomers] = useState<FailedCustomer[]>([]);

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [nickname, setNickname] = useState<string>("");
  const [isFetching, setIsFetching] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedNickname = localStorage.getItem("nickname");
    if (token) {
      setIsLoggedIn(true);
      if (storedNickname) {
        setNickname(storedNickname);
        identifyUser(token, storedNickname);
      }
    }

    if (typeof window !== "undefined") {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get("tab");
      if (tabParam) {
        setActiveTab(tabParam);
      }
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    trackEvent("Tab View", { tab: activeTab });
  }, [activeTab]);

  // Webview communications receiver
  useEffect(() => {
    const receiveNativeMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "NATIVE_GPS_RESPONSE") {
          const { latitude, longitude } = data.payload;
          console.log("GPS received from native device:", latitude, longitude);
        }
      } catch (e) {
        console.error("Error handling native message:", e);
      }
    };

    window.addEventListener("message", receiveNativeMessage);
    document.addEventListener("message", receiveNativeMessage as any);

    (window as any).reactSetActiveTab = (tab: string) => {
      setActiveTab(tab);
    };

    return () => {
      window.removeEventListener("message", receiveNativeMessage);
      document.removeEventListener("message", receiveNativeMessage as any);
      delete (window as any).reactSetActiveTab;
    };
  }, []);

  const [isSpeedDialOpen, setIsSpeedDialOpen] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showLoginView, setShowLoginView] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const triggerExcelUpload = () => {
    if (!isLoggedIn) return requireAuth("엑셀 업로드");
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
    setIsSpeedDialOpen(false);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const success = await handleUploadExcel(e.target.files[0]);
      if (success) {
        setIsSpeedDialOpen(false);
      }
    }
  };

  const requireAuth = (actionName: string): boolean => {
    if (!isLoggedIn) {
      showConfirm({
        title: "로그인 필요",
        message: `${actionName} 기능은 로그인이 필요합니다. 로그인 화면으로 이동하시겠습니까?`,
        confirmText: "로그인 하기",
        onConfirm: () => {
          setShowLoginView(true);
        },
      });
      return false;
    }
    return true;
  };

  const handleLogout = () => {
    showConfirm({
      title: "로그아웃",
      message: "로그아웃 하시겠습니까?",
      confirmText: "로그아웃",
      onConfirm: () => {
        localStorage.removeItem("token");
        localStorage.removeItem("nickname");
        localStorage.removeItem("routeOrder");
        setIsLoggedIn(false);
        setNickname("");
        setSuccessCustomers([]);
        setFailedCustomers([]);
        resetUser();
        trackEvent("Logout");
      },
    });
  };

  const fetchCustomers = async () => {
    if (!isLoggedIn) return; // Don't fetch in guest mode
    setIsFetching(true);
    try {
      const data = await customerRepository.getCustomers();
      const list = data.success_list || [];

      // Sequence sort logic from routeOrder
      const savedOrder = localStorage.getItem("routeOrder");
      if (savedOrder) {
        try {
          const orderIds = JSON.parse(savedOrder);
          list.sort((a: Customer, b: Customer) => {
            const idxA = orderIds.indexOf(a.id);
            const idxB = orderIds.indexOf(b.id);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
        } catch (e) {
          console.error(e);
        }
      }

      setSuccessCustomers(list);
      setFailedCustomers(data.failed_list || []);
    } catch (error: any) {
      if (error.message === "UNAUTHORIZED") {
        showAlert({
          title: "로그인 세션 만료",
          message: "로그인 정보가 만료되었습니다. 다시 로그인해주세요.",
          type: "warning",
        });
        localStorage.removeItem("token");
        localStorage.removeItem("nickname");
        localStorage.removeItem("routeOrder");
        setIsLoggedIn(false);
        setNickname("");
      } else {
        console.error(error);
        showAlert({
          title: "데이터 로딩 오류",
          message: "서버로부터 영업 고객 정보를 가져오는데 실패했습니다.",
          type: "error",
          debugInfo: error.stack || error.toString(),
        });
      }
    } finally {
      setIsFetching(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!requireAuth("고객 삭제")) return;
    showConfirm({
      title: "고객 삭제",
      message: "정말 삭제하시겠습니까?",
      confirmText: "삭제",
      onConfirm: async () => {
        try {
          const ok = await customerRepository.deleteCustomer(id);
          if (ok) {
            trackEvent("Delete Customer", { customer_id: id });
            fetchCustomers();
          } else {
            showAlert({
              title: "삭제 실패",
              message: "서버 오류로 인해 삭제하지 못했습니다.",
              type: "error",
            });
          }
        } catch (error: any) {
          console.error(error);
          showAlert({
            title: "삭제 실패",
            message: "네트워크 오류가 발생했습니다.",
            type: "error",
            debugInfo: error.stack || error.toString(),
          });
        }
      },
    });
  };

  const handleClearAll = async () => {
    if (!requireAuth("데이터 초기화")) return;
    showConfirm({
      title: "전체 데이터 초기화",
      message:
        "전체 고객 데이터를 초기화하시겠습니까? 이 작업은 되돌릴 수 없습니다.",
      confirmText: "초기화",
      onConfirm: async () => {
        try {
          const ok = await customerRepository.clearAllCustomers();
          if (ok) {
            trackEvent("Clear All Customers");
            showAlert({
              title: "초기화 완료",
              message: "전체 데이터가 성공적으로 초기화되었습니다.",
              type: "success",
            });
            fetchCustomers();
          } else {
            showAlert({
              title: "초기화 실패",
              message: "데이터 초기화 처리에 실패했습니다.",
              type: "error",
            });
          }
        } catch (error: any) {
          console.error(error);
          showAlert({
            title: "초기화 실패",
            message: "서버 요청 중 예외 오류가 발생했습니다.",
            type: "error",
            debugInfo: error.stack || error.toString(),
          });
        }
      },
    });
  };

  const handleToggleStar = async (id: number, favorite: boolean) => {
    if (!requireAuth("즐겨찾기")) return;
    try {
      const ok = await customerRepository.toggleFavorite(id, favorite);
      if (ok) {
        trackEvent("Toggle Favorite", { customer_id: id, favorite });
        // Optimistic state update to make stars highly responsive
        setSuccessCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, favorite } : c)),
        );
        setFailedCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, favorite } : c)),
        );
      } else {
        showAlert({
          title: "즐겨찾기 실패",
          message: "즐겨찾기 설정을 동기화하지 못했습니다.",
          type: "warning",
        });
      }
    } catch (e: any) {
      console.error("Failed to toggle favorite", e);
      showAlert({
        title: "오류 발생",
        message: "즐겨찾기 수정에 실패했습니다.",
        type: "error",
        debugInfo: e.stack || e.toString(),
      });
    }
  };

  const handleToggleAbsent = async (id: number, absent: boolean) => {
    if (!requireAuth("부재중 설정")) return;
    try {
      const ok = await customerRepository.toggleAbsent(id, absent);
      if (ok) {
        trackEvent("Toggle Absent", { customer_id: id, absent });
        setSuccessCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, absent } : c)),
        );
        setFailedCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, absent } : c)),
        );
      } else {
        showAlert({
          title: "부재중 설정 실패",
          message: "부재중 설정을 동기화하지 못했습니다.",
          type: "warning",
        });
      }
    } catch (e: any) {
      console.error("Failed to toggle absent", e);
      showAlert({
        title: "오류 발생",
        message: "부재중 수정에 실패했습니다.",
        type: "error",
        debugInfo: e.stack || e.toString(),
      });
    }
  };

  const handleUpdateVisitTime = async (id: number, time: string | null) => {
    if (!requireAuth("일정 변경")) return;
    try {
      const ok = await customerRepository.updateVisitTime(id, time);
      if (ok) {
        trackEvent("Update Visit Time", { customer_id: id, visit_time: time });
        setSuccessCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, visit_time: time } : c)),
        );
        setFailedCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, visit_time: time } : c)),
        );
      } else {
        showAlert({
          title: "일정 업데이트 실패",
          message: "방문 일정을 반영하지 못했습니다.",
          type: "warning",
        });
      }
    } catch (e: any) {
      console.error("Failed to update visit time", e);
      showAlert({
        title: "오류 발생",
        message: "방문 일정 저장 중 오류가 발생했습니다.",
        type: "error",
        debugInfo: e.stack || e.toString(),
      });
    }
  };

  const handleEditAddress = async (
    id: number,
    address: string,
  ): Promise<boolean> => {
    if (!requireAuth("주소 수정")) return false;
    try {
      const result = await customerRepository.updateAddress(id, address);
      if (result.success) {
        trackEvent("Update Address", { customer_id: id, success: true });
        await fetchCustomers();
        return true;
      }
      trackEvent("Update Address", { customer_id: id, success: false });
      showAlert({
        title: "주소 변환 실패",
        message:
          "입력하신 주소의 GPS 좌표를 찾을 수 없습니다. 정확한 주소를 입력했는지 확인해 주세요.",
        type: "warning",
      });
      return false;
    } catch (e: any) {
      console.error("Failed to edit address", e);
      showAlert({
        title: "서버 오류",
        message: "주소 수정 처리 중 오류가 발생했습니다.",
        type: "error",
        debugInfo: e.stack || e.toString(),
      });
      return false;
    }
  };

  const handleUpdateStatus = async (id: number, status: string) => {
    if (!requireAuth("고객 상태 변경")) return;
    try {
      const ok = await customerRepository.updateStatus(id, status);
      if (ok) {
        trackEvent("Update Status", { customer_id: id, status });
        setSuccessCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status } : c)),
        );
        setFailedCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, status } : c)),
        );
      } else {
        showAlert({
          title: "상태 변경 실패",
          message: "고객 상태 변경 처리가 반영되지 않았습니다.",
          type: "warning",
        });
      }
    } catch (e: any) {
      console.error("Failed to update status", e);
      showAlert({
        title: "오류 발생",
        message: "상태 수정 중 오류가 발생했습니다.",
        type: "error",
        debugInfo: e.stack || e.toString(),
      });
    }
  };

  const handleUploadExcel = async (file: File): Promise<boolean> => {
    if (!requireAuth("엑셀 업로드")) return false;
    setIsFetching(true);
    setIsUploading(true);
    try {
      const result = await customerRepository.uploadExcel(file);
      if (result !== null) {
        const { addedCount, deletedCount } = result;
        trackEvent("Upload Excel", { success: true, added_count: addedCount, deleted_count: deletedCount });
        showAlert({
          title: "업로드 성공",
          message: `엑셀 데이터 연동이 완료되었습니다!\n고객수 + ${addedCount} - ${deletedCount}`,
          type: "success",
        });
        await fetchCustomers();
        return true;
      } else {
        trackEvent("Upload Excel", { success: false });
        showAlert({
          title: "업로드 실패",
          message:
            "엑셀 데이터를 서버에 업로드하지 못했습니다. 형식이 맞는지 확인해주세요.",
          type: "error",
        });
        return false;
      }
    } catch (e: any) {
      trackEvent("Upload Excel", { success: false, error: e.toString() });
      showAlert({
        title: "업로드 실패",
        message: "엑셀 파일 업로드 중 서버 에러가 발생했습니다.",
        type: "error",
        debugInfo: e.stack || e.toString(),
      });
      return false;
    } finally {
      setIsFetching(false);
      setIsUploading(false);
    }
  };

  const handleUpdateMemo = async (
    id: number,
    memo: string,
  ): Promise<boolean> => {
    if (!requireAuth("메모 수정")) return false;
    try {
      const ok = await customerRepository.updateMemo(id, memo);
      if (ok) {
        trackEvent("Update Memo", { customer_id: id });
        setSuccessCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, memo } : c)),
        );
        setFailedCustomers((prev) =>
          prev.map((c) => (c.id === id ? { ...c, memo } : c)),
        );
        return true;
      }
      showAlert({
        title: "메모 저장 실패",
        message: "메모를 서버에 임시 또는 영구 반영하지 못했습니다.",
        type: "warning",
      });
      return false;
    } catch (e: any) {
      console.error("Failed to update memo", e);
      showAlert({
        title: "오류 발생",
        message: "메모 저장 도중 서버 에러가 발생했습니다.",
        type: "error",
        debugInfo: e.stack || e.toString(),
      });
      return false;
    }
  };

  const handleAddCustomer = async (
    name: string,
    address: string,
    phone: string,
    modelName: string,
    serviceType: string,
  ): Promise<boolean> => {
    if (!requireAuth("고객 등록")) return false;
    try {
      const ok = await customerRepository.addCustomer(
        name,
        address,
        phone,
        modelName,
        serviceType,
      );
      if (ok) {
        trackEvent("Add Customer", { name, service_type: serviceType, model_name: modelName });
        showAlert({
          title: "등록 완료",
          message: `${name} 고객님이 정상적으로 등록되었습니다.`,
          type: "success",
        });
        await fetchCustomers();
        return true;
      }
      trackEvent("Add Customer Failed", { name });
      showAlert({
        title: "등록 실패",
        message:
          "입력된 정보로 주소를 검색할 수 없거나 서버 등록 오류가 발생했습니다.",
        type: "warning",
      });
      return false;
    } catch (e: any) {
      console.error("Failed to add customer", e);
      showAlert({
        title: "등록 실패",
        message: "고객 등록 처리 중 예외 에러가 발생했습니다.",
        type: "error",
        debugInfo: e.stack || e.toString(),
      });
      return false;
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchCustomers();
    }
  }, [isLoggedIn]);

  if (isLoading) return <div className="min-h-screen bg-[#f8fafc]"></div>;
  if (showLoginView) {
    return (
      <div className="relative">
        <button
          onClick={() => setShowLoginView(false)}
          className="absolute top-5 left-5 z-50 text-[13px] font-extrabold text-slate-500 bg-white/80 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200/50 hover:bg-slate-50 transition shadow-sm"
        >
          ← 뒤로가기
        </button>
        <Login />
      </div>
    );
  }

  return (
    <div className="min-h-screen app-pastel-bg flex flex-col max-w-md mx-auto relative shadow-2xl overflow-x-hidden border-x border-slate-100/60">
      <Header
        isLoggedIn={isLoggedIn}
        nickname={nickname}
        onLoginClick={() => setShowLoginView(true)}
      />

      <main className="flex-1 w-full bg-transparent">
        {activeTab === "home" && (
          <HomeTab
            customers={successCustomers}
            failedCustomers={failedCustomers}
            nickname={nickname}
            setActiveTab={setActiveTab}
            onToggleStar={handleToggleStar}
            onAddCustomerClick={() => {
              setActiveTab("customer");
              setIsSpeedDialOpen(true);
            }}
          />
        )}
        {activeTab === "map" && (
          <MapTab
            customers={successCustomers}
            backendIp={BACKEND_IP}
            onToggleStar={handleToggleStar}
            onToggleAbsent={handleToggleAbsent}
            onUpdateVisitTime={handleUpdateVisitTime}
            onUpdateStatus={handleUpdateStatus}
            setActiveTab={setActiveTab}
          />
        )}
        {activeTab === "customer" && (
          <CustomerTab
            customers={successCustomers}
            failedCustomers={failedCustomers}
            onDeleteCustomer={handleDelete}
            onClearAll={handleClearAll}
            onRefresh={fetchCustomers}
            onToggleStar={handleToggleStar}
            onToggleAbsent={handleToggleAbsent}
            onUpdateVisitTime={handleUpdateVisitTime}
            onUpdateStatus={handleUpdateStatus}
            onEditAddress={handleEditAddress}
            onUpdateMemo={handleUpdateMemo}
            onUploadExcel={handleUploadExcel}
            isFetching={isFetching}
          />
        )}
        {activeTab === "settings" && (
          <SettingsTab
            nickname={nickname}
            onLogout={isLoggedIn ? handleLogout : () => setShowLoginView(true)}
            backendIp={BACKEND_IP}
          />
        )}
      </main>

      {/* Persistent floating Speed Dial FAB for Customer Tab */}
      {activeTab === "customer" && (
        <div className="fixed bottom-30 right-[calc(50%-180px)] z-50 flex flex-col items-end gap-3 max-w-md">
          {isSpeedDialOpen && (
            <div className="flex flex-col items-end gap-2.5 mb-1 animate-slideUp">
              <button
                onClick={() => {
                  if (!isLoggedIn) return requireAuth("주소 등록");
                  setShowAddModal(true);
                  setIsSpeedDialOpen(false);
                }}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-800 font-extrabold text-[12.5px] rounded-2xl border border-slate-300 shadow-lg hover:bg-slate-50 transition"
              >
                📝 직접 등록
              </button>
              <button
                onClick={triggerExcelUpload}
                className="flex items-center gap-2 px-4 py-2.5 bg-white text-slate-800 font-extrabold text-[12.5px] rounded-2xl border border-slate-300 shadow-lg hover:bg-slate-50 transition"
              >
                📁 엑셀 업로드
              </button>
            </div>
          )}
          <button
            onClick={() => setIsSpeedDialOpen(!isSpeedDialOpen)}
            className={`w-14 h-14 rounded-full flex items-center justify-center text-white text-2xl font-bold border border-white/25 backdrop-blur-md transition-all duration-300 shadow-xl ${
              isSpeedDialOpen
                ? "bg-gradient-to-br from-rose-500/80 to-purple-600/80 rotate-45 scale-95 shadow-[0_4px_16px_rgba(244,63,94,0.3)]"
                : "bg-gradient-to-br from-blue-500/80 via-indigo-500/80 to-purple-600/80 hover:scale-105 hover:shadow-[0_8px_32px_rgba(99,102,241,0.45)] shadow-[0_8px_24px_rgba(99,102,241,0.35)]"
            }`}
          >
            +
          </button>
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileChange}
            accept=".xlsx, .xls"
            className="hidden"
          />
        </div>
      )}

      {/* Manual Registration Modal */}
      {showAddModal && (
        <AddCustomerModal
          onSave={handleAddCustomer}
          onCancel={() => setShowAddModal(false)}
        />
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Full screen backdrop blur Excel Uploading spinner */}
      {isUploading && (
        <div className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-slate-900/20 backdrop-blur-[2px] transition-all">
          <div className="bg-white p-6 rounded-2xl shadow-xl flex flex-col items-center gap-3 border border-slate-100 max-w-[280px]">
            <div className="w-9 h-9 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
            <div className="text-center">
              <p className="text-[13.5px] font-extrabold text-slate-800">
                엑셀 업로드 중...
              </p>
              <p className="text-[11px] text-slate-400 mt-0.5">
                데이터를 동기화하고 있습니다.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Page() {
  return (
    <AlertProvider>
      <StatusProvider>
        <PageContent />
      </StatusProvider>
    </AlertProvider>
  );
}
