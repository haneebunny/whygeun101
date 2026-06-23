"use client";

import React, { useState } from "react";
import { useStatus } from "../../components/StatusContext";
import { authRepository } from "../../../data/repositories/authApi";

interface SettingsTabProps {
  nickname: string;
  onLogout: () => void;
  backendIp: string;
}

export default function SettingsTab({
  nickname,
  onLogout,
  backendIp,
}: SettingsTabProps) {
  const { statusLabels, updateStatusLabel } = useStatus();
  
  const [isAlertEnabled, setIsAlertEnabled] = useState(true);
  const [alertTime, setAlertTime] = useState("30분 전");
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editedNickname, setEditedNickname] = useState(nickname);

  const handleProfileSave = async () => {
    if (editedNickname.trim()) {
      try {
        await authRepository.updateNickname(editedNickname);
        localStorage.setItem("nickname", editedNickname);
        setIsEditingProfile(false);
        window.location.reload(); // Quick refresh to update throughout the app
      } catch (err) {
        console.error("Failed to update nickname in DB:", err);
        // Fallback: save to localStorage anyway
        localStorage.setItem("nickname", editedNickname);
        setIsEditingProfile(false);
        window.location.reload();
      }
    }
  };

  return (
    <div className="flex flex-col gap-6 p-5 pb-28">
      {/* Title */}
      <div className="flex flex-col gap-1">
        <h2 className="text-xl font-extrabold text-slate-800 tracking-tight leading-tight">설정</h2>
        <p className="text-[12px] text-slate-400 font-semibold">서비스 설정을 관리하세요</p>
      </div>

      {/* Profile Card */}
      <section className="bg-white p-4.5 rounded-2xl border border-slate-100/80 shadow-sm flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar Icon */}
          <div className="w-12 h-12 bg-blue-50 border border-blue-100 rounded-2xl flex items-center justify-center text-blue-600 font-black text-[18px]">
            {nickname ? nickname.charAt(0) : "G"}
          </div>

          <div className="flex flex-col gap-0.5">
            {nickname ? (
              isEditingProfile ? (
                <div className="flex gap-1.5 items-center mt-1">
                  <input
                    type="text"
                    value={editedNickname}
                    onChange={(e) => setEditedNickname(e.target.value)}
                    className="px-2 py-1 border border-slate-200 rounded-lg text-[13px] outline-none focus:border-blue-400 max-w-[120px]"
                  />
                  <button
                    onClick={handleProfileSave}
                    className="px-2 py-1 bg-blue-600 text-white text-[11px] font-bold rounded-lg"
                  >
                    저장
                  </button>
                </div>
              ) : (
                <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-1.5">
                  {nickname}님
                </h3>
              )
            ) : (
              <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-1.5">
                게스트 모드
              </h3>
            )}
            <span className="text-[11.5px] font-extrabold text-blue-600">
              {nickname ? "Premium 사용자" : "로그인이 필요합니다"}
            </span>
            <span className="text-[10px] text-slate-400 font-medium">
              {nickname ? "smart@work.com" : "기능 이용에 제한이 있을 수 있습니다"}
            </span>
          </div>
        </div>

        {nickname ? (
          <button
            onClick={() => {
              setIsEditingProfile(!isEditingProfile);
              setEditedNickname(nickname);
            }}
            className="px-3 py-1.5 border border-slate-200 hover:bg-slate-50 transition text-[11px] font-bold text-slate-500 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            ✏️ 수정
          </button>
        ) : (
          <button
            onClick={onLogout} // Will trigger redirect to login view/action
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-bold rounded-lg transition"
          >
            로그인
          </button>
        )}
      </section>

      {/* Customer Status Management */}
      <section className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[13.5px] font-black text-slate-800 flex items-center gap-1.5">
            🎨 고객 상태 관리
          </h3>
          <p className="text-[10.5px] text-slate-400 font-semibold">고객 상태명을 원하는 대로 설정하세요</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/30 transition flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-[13px] font-bold text-slate-600">미컨택</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={statusLabels.none}
                onChange={(e) => updateStatusLabel("none", e.target.value)}
                className="bg-transparent border-0 outline-none text-right text-[12.5px] font-bold text-slate-600 max-w-[100px] border-b border-slate-200/40 focus:border-blue-400"
              />
              <span className="text-slate-300 font-semibold">❯</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/30 transition flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-[13px] font-bold text-slate-600">컨택</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={statusLabels.contact}
                onChange={(e) => updateStatusLabel("contact", e.target.value)}
                className="bg-transparent border-0 outline-none text-right text-[12.5px] font-bold text-slate-600 max-w-[100px] border-b border-slate-200/40 focus:border-blue-400"
              />
              <span className="text-slate-300 font-semibold">❯</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/30 transition flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-[13px] font-bold text-slate-600">완료</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={statusLabels.done}
                onChange={(e) => updateStatusLabel("done", e.target.value)}
                className="bg-transparent border-0 outline-none text-right text-[12.5px] font-bold text-slate-600 max-w-[100px] border-b border-slate-200/40 focus:border-blue-400"
              />
              <span className="text-slate-300 font-semibold">❯</span>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications Settings */}
      <section className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-0.5">
          <h3 className="text-[13.5px] font-black text-slate-800 flex items-center gap-1.5">
            🔔 알림 설정
          </h3>
          <p className="text-[10.5px] text-slate-400 font-semibold">방문 일정 관련 알림을 설정하세요</p>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/30 transition">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold text-slate-700">방문 일정 알림</span>
              <span className="text-[10px] text-slate-400 font-semibold">방문 일정 시작 전 알림을 받습니다</span>
            </div>
            <button
              onClick={() => setIsAlertEnabled(!isAlertEnabled)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${
                isAlertEnabled ? "bg-blue-600" : "bg-slate-200"
              }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform ${
                  isAlertEnabled ? "translate-x-5" : "translate-x-0"
                }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-slate-50/50 hover:bg-slate-50 rounded-xl border border-slate-100/30 transition cursor-pointer">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13px] font-bold text-slate-700">알림 시간</span>
              <span className="text-[10px] text-slate-400 font-semibold">방문 일정 시작 전 설정</span>
            </div>
            <div className="flex items-center gap-1.5 select-none">
              <select
                value={alertTime}
                onChange={(e) => setAlertTime(e.target.value)}
                className="outline-none bg-transparent font-bold text-[12.5px] text-slate-500 cursor-pointer text-right appearance-none mr-1"
              >
                <option value="10분 전">10분 전</option>
                <option value="30분 전">30분 전</option>
                <option value="1시간 전">1시간 전</option>
              </select>
              <span className="text-slate-300 font-semibold">❯</span>
            </div>
          </div>
        </div>
      </section>

      {/* App Info Card */}
      <section className="bg-white rounded-2xl border border-slate-100/80 shadow-sm p-4 flex flex-col gap-1.5">
        <h3 className="text-[13.5px] font-black text-slate-800 flex items-center gap-1.5 mb-2">
          ℹ️ 앱 정보
        </h3>

        <div className="flex items-center justify-between py-2 border-b border-slate-50">
          <span className="text-[12.5px] font-semibold text-slate-600">버전</span>
          <span className="text-[12px] font-bold text-slate-400">v1.0.0</span>
        </div>

        <a
          href="/privacy"
          className="flex items-center justify-between py-2.5 border-b border-slate-50 hover:text-blue-600 transition"
        >
          <span className="text-[12.5px] font-semibold text-slate-600">개인정보처리방침</span>
          <span className="text-slate-300 font-semibold">❯</span>
        </a>

        <a
          href="/terms"
          className="flex items-center justify-between py-2.5 border-b border-slate-50 hover:text-blue-600 transition"
        >
          <span className="text-[12.5px] font-semibold text-slate-600">이용약관</span>
          <span className="text-slate-300 font-semibold">❯</span>
        </a>

        <div className="flex items-center justify-between py-2.5 hover:text-blue-600 transition cursor-pointer">
          <span className="text-[12.5px] font-semibold text-slate-600">문의하기</span>
          <span className="text-slate-300 font-semibold">❯</span>
        </div>
      </section>

      {/* Logout Button */}
      {nickname && (
        <button
          onClick={onLogout}
          className="w-full py-4 bg-slate-50 border border-slate-200/60 hover:bg-rose-50/30 hover:text-rose-600 text-slate-500 font-extrabold text-[13.5px] rounded-2xl transition shadow-sm cursor-pointer mt-1"
        >
          🚪 로그아웃
        </button>
      )}
    </div>
  );
}
