"use client";

import React, { useState, useEffect } from "react";
import Hero from "@/components/Hero";
import ExcelUploader from "@/components/ExcelUploader";
import KakaoMap from "@/components/KakaoMap";
import CustomerList from "@/components/CustomerList";
import BottomNav from "@/components/BottomNav";
import Login from "@/components/Login";
import { Customer, FailedCustomer } from "@/types";

export default function Home() {
  const IS_DEV = process.env.NODE_ENV === "development";
  const BACKEND_IP = IS_DEV
    ? `${typeof window !== "undefined" ? window.location.hostname : "localhost"}:8080`
    : "sales-map-api-java.onrender.com";

  const [activeTab, setActiveTab] = useState<string>("home");
  const [successCustomers, setSuccessCustomers] = useState<Customer[]>([]);
  const [failedCustomers, setFailedCustomers] = useState<FailedCustomer[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [nickname, setNickname] = useState<string>("");
  const [isFetching, setIsFetching] = useState(false);

  // 실패 목록 아코디언 열림/닫힘 상태
  const [isFailedListOpen, setIsFailedListOpen] = useState(false);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedNickname = localStorage.getItem("nickname");
    if (token) {
      setIsLoggedIn(true);
      if (storedNickname) setNickname(storedNickname);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    const receiveNativeMessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "NATIVE_GPS_RESPONSE") {
          const { latitude, longitude } = data.payload;
          // 1. 내 지도의 중심 좌표 값을 이 위/경도로 세팅!
          // 2. 혹은 필요시 영업팀 서버 사서 DB에 외근 현장 기록 백엔드로 갱신 요청 보내기!
          console.log("기기로부터 전송받은 GPS:", latitude, longitude);
        }
      } catch (e) {
        console.error("네이티브 메시지 처리 중 오류:", e);
      }
    };

    // iOS 및 안드로이드 웹뷰 통신 수신용 이벤트 부착
    window.addEventListener("message", receiveNativeMessage);
    document.addEventListener("message", receiveNativeMessage);

    return () => {
      window.removeEventListener("message", receiveNativeMessage);
      document.removeEventListener("message", receiveNativeMessage);
    };
  }, []);

  const handleLogout = () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;
    localStorage.removeItem("token");
    localStorage.removeItem("nickname");
    setIsLoggedIn(false);
    setNickname("");
    setSuccessCustomers([]);
    setFailedCustomers([]);
  };

  const fetchCustomers = async () => {
    setIsFetching(true);
    try {
      const token = localStorage.getItem("token");
      const protocol = IS_DEV ? "http" : "https";
      const response = await fetch(
        `${protocol}://${BACKEND_IP}/api/customers`,
        {
          headers: { Authorization: `Bearer ${token}` },
        },
      );

      if (response.ok) {
        const data = await response.json();
        const list = data.success_list || [];

        const savedOrder = localStorage.getItem("routeOrder");
        if (savedOrder) {
          const orderIds = JSON.parse(savedOrder);
          list.sort((a: Customer, b: Customer) => {
            const idxA = orderIds.indexOf(a.id);
            const idxB = orderIds.indexOf(b.id);
            if (idxA === -1) return 1;
            if (idxB === -1) return -1;
            return idxA - idxB;
          });
        }

        setSuccessCustomers(list);
        setFailedCustomers(data.failed_list || []);
      } else if (response.status === 401) {
        // 서버가 초기화되었거나 토큰이 만료되어 401 에러가 반환된 경우 자동 로그아웃 처리
        alert(
          "로그인 정보가 만료되었거나 서버가 초기화되었습니다. 다시 로그인해주세요.",
        );
        localStorage.removeItem("token");
        localStorage.removeItem("nickname");
        localStorage.removeItem("routeOrder");
        setIsLoggedIn(false);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setIsFetching(false);
    }
  };

  const handleEditSubmit = async (customerId: number) => {
    if (!editText.trim()) return;
    try {
      const token = localStorage.getItem("token");
      const protocol = IS_DEV ? "http" : "https";
      const response = await fetch(
        `${protocol}://${BACKEND_IP}/api/customers/${customerId}`,
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ address: editText }),
        },
      );
      if (response.ok) {
        const resData = await response.json();
        if (resData.success) {
          setEditId(null);
          fetchCustomers();
        } else {
          alert("수정된 주소로도 좌표를 찾지 못했습니다.");
        }
      }
    } catch (e) {
      alert("오류가 발생했습니다.");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("삭제하시겠습니까?")) return;
    try {
      const token = localStorage.getItem("token");
      const protocol = IS_DEV ? "http" : "https";
      const response = await fetch(
        `${protocol}://${BACKEND_IP}/api/customers/${id}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (response.ok) fetchCustomers();
    } catch (error) {
      console.error(error);
    }
  };

  useEffect(() => {
    if (isLoggedIn) {
      fetchCustomers();
      (window as any).handleDeleteCustomer = handleDelete;
    }
  }, [isLoggedIn]);

  if (isLoading) return <div className="min-h-screen bg-[#f5f7fa]"></div>;
  if (!isLoggedIn) return <Login />;

  return (
    <div className="min-h-screen bg-[#f5f7fa] flex flex-col max-w-md mx-auto relative shadow-2xl overflow-x-hidden">
      <header className="flex justify-between items-center px-5 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100">
        <div className="flex items-center gap-1.5 text-blue-600">
          <img src="/icon.png" alt="logo" className="w-5 h-5 object-contain" />
          <span className="font-black text-[15px] text-slate-800 tracking-tight">
            외근의 정석
          </span>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
            <span className="text-[11px] font-bold text-blue-700">
              {nickname}님
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="text-[11px] font-bold text-slate-400 hover:text-rose-500 transition"
          >
            로그아웃
          </button>
        </div>
      </header>

      {activeTab === "home" ? (
        <main className="flex flex-col gap-6 p-5 pb-28">
          <Hero />

          {isFetching && successCustomers.length === 0 && (
            <div className="flex flex-col items-center justify-center py-12 bg-white rounded-2xl shadow-sm border border-slate-100">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-blue-100 border-t-blue-600 mb-4"></div>
              <p className="text-[13px] font-bold text-slate-700">
                서버를 깨우고 데이터를 불러오는 중...
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                무료 서버라 최대 1분 정도 걸릴 수 있어요 😴
              </p>
            </div>
          )}

          <ExcelUploader
            onUploadSuccess={fetchCustomers}
            backendIp={BACKEND_IP}
          />
          <KakaoMap
            customers={successCustomers}
            onExpand={() => setActiveTab("map")}
            backendIp={BACKEND_IP}
          />

          {/* 💡 실패 목록 아코디언 (지도 밑으로 이동) */}
          {failedCustomers.length > 0 && (
            <div className="flex flex-col gap-3 p-4 bg-white border border-rose-100 rounded-2xl shadow-sm">
              <button
                onClick={() => setIsFailedListOpen(!isFailedListOpen)}
                className="flex justify-between items-center w-full text-left"
              >
                <div className="font-bold text-sm text-rose-600 flex items-center gap-1.5">
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
                  strokeWidth="2"
                  className={`text-slate-400 transition-transform ${isFailedListOpen ? "rotate-180" : ""}`}
                >
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </button>

              {isFailedListOpen && (
                <ul className="flex flex-col gap-3 max-h-60 overflow-y-auto mt-2 pt-2 border-t border-rose-50">
                  {failedCustomers.map((item) => (
                    <li
                      key={item.id}
                      className="text-xs pb-3 flex flex-col gap-2 border-b border-slate-50 last:border-0"
                    >
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex flex-col gap-0.5">
                          <strong className="text-slate-800 text-sm">
                            {item.name}
                          </strong>
                          <span className="text-slate-500">{item.address}</span>
                        </div>
                        <button
                          onClick={() => {
                            setEditId(item.id);
                            setEditText(item.address);
                          }}
                          className="text-slate-400 hover:text-blue-600 p-1.5 bg-slate-50 rounded-lg border border-slate-100"
                        >
                          수정
                        </button>
                      </div>
                      {editId === item.id && (
                        <div className="flex gap-2 mt-1">
                          <input
                            type="text"
                            className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none focus:border-blue-300"
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                          />
                          <button
                            onClick={() => handleEditSubmit(item.id)}
                            className="px-3 py-1.5 bg-emerald-500 text-white font-bold rounded-lg"
                          >
                            확인
                          </button>
                          <button
                            onClick={() => setEditId(null)}
                            className="px-3 py-1.5 bg-slate-300 text-white rounded-lg"
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

          <CustomerList
            customers={successCustomers}
            handleDelete={handleDelete}
          />
        </main>
      ) : (
        <main className="w-full h-[calc(100vh-140px)] relative">
          <KakaoMap
            customers={successCustomers}
            isFullScreen={true}
            backendIp={BACKEND_IP}
          />
        </main>
      )}

      <BottomNav activeTab={activeTab} setActiveTab={setActiveTab} />
    </div>
  );
}
