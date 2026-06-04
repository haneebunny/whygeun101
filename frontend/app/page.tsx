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
    ? "172.30.103.23:8000"
    : "sales-map-db.onrender.com";

  const [activeTab, setActiveTab] = useState<string>("home");
  const [successCustomers, setSuccessCustomers] = useState<Customer[]>([]);
  const [failedCustomers, setFailedCustomers] = useState<FailedCustomer[]>([]);
  const [editId, setEditId] = useState<number | null>(null);
  const [editText, setEditText] = useState<string>("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // 💡 닉네임을 저장할 상태 추가
  const [nickname, setNickname] = useState<string>("");

  useEffect(() => {
    const token = localStorage.getItem("token");
    const storedNickname = localStorage.getItem("nickname"); // 💡 금고에서 닉네임 꺼내기

    if (token) {
      setIsLoggedIn(true);
      if (storedNickname) setNickname(storedNickname);
    }
    setIsLoading(false);
  }, []);

  // 💡 로그아웃 기능 추가
  const handleLogout = () => {
    if (!confirm("로그아웃 하시겠습니까?")) return;

    localStorage.removeItem("token");
    localStorage.removeItem("nickname");

    // 상태 초기화해서 로그인 화면으로 돌아가게 만들기
    setIsLoggedIn(false);
    setNickname("");
    setSuccessCustomers([]);
    setFailedCustomers([]);
  };

  const fetchCustomers = async () => {
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
        setSuccessCustomers(data.success_list || []);
        setFailedCustomers(data.failed_list || []);
      }
    } catch (error) {
      console.error(error);
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
      {/* 💡 헤더(Header) 영역 수정: 닉네임과 로그아웃 버튼 추가 */}
      <header className="flex justify-between items-center px-5 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50">
        <div className="flex items-center gap-1.5 text-blue-600">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
          </svg>
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

          {failedCustomers.length > 0 && (
            <div className="flex flex-col gap-3 p-4 bg-rose-50 border border-rose-100 rounded-2xl shadow-sm">
              <div className="font-bold text-sm text-rose-700">
                ⚠️ 주소 불일치 실패 목록 ({failedCustomers.length}건)
              </div>
              <ul className="flex flex-col gap-3 max-h-48 overflow-y-auto">
                {failedCustomers.map((item) => (
                  <li
                    key={item.id}
                    className="text-xs border-b border-rose-100 pb-3 flex flex-col gap-2"
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
                        className="text-slate-400 hover:text-blue-600 p-1 bg-white rounded shadow-sm border border-slate-200"
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <path d="M12 20h9"></path>
                          <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"></path>
                        </svg>
                      </button>
                    </div>
                    {editId === item.id && (
                      <div className="flex gap-2 mt-1">
                        <input
                          type="text"
                          className="flex-1 px-3 py-1.5 rounded-lg border border-slate-200 text-slate-800 focus:outline-none"
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
                          className="px-3 py-1.5 bg-slate-400 text-white rounded-lg"
                        >
                          취소
                        </button>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
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
