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
    <div className="flex flex-col gap-6 p-5 pb-28 bg-transparent animate-slide-up">


      {/* Profile Card */}
      <section className="glass-card p-4.5 flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          {/* Avatar Icon */}
          <div className="w-12 h-12 bg-primary/10 border border-primary/20 rounded-2xl flex items-center justify-center text-primary font-black text-[18px]">
            {nickname ? nickname.charAt(0) : "G"}
          </div>

          <div className="flex flex-col gap-0.5 min-w-0">
            {nickname ? (
              isEditingProfile ? (
                <div className="flex gap-1.5 items-center mt-1">
                  <input
                    type="text"
                    value={editedNickname}
                    onChange={(e) => setEditedNickname(e.target.value)}
                    className="px-2.5 py-1 border border-white/20 rounded-xl text-[13px] outline-none focus:border-primary bg-white/50 backdrop-blur-sm shadow-inner max-w-[120px] font-bold"
                  />
                  <button
                    onClick={handleProfileSave}
                    className="px-2.5 py-1 bg-primary text-white text-[11px] font-black rounded-lg cursor-pointer transition shadow-sm"
                  >
                    저장
                  </button>
                </div>
              ) : (
                <h3 className="text-[15px] font-extrabold text-slate-800 flex items-center gap-1.5 truncate">
                  {nickname}님
                </h3>
              )
            ) : (
              <h3 className="text-[15px] font-extrabold text-slate-850 flex items-center gap-1.5">
                게스트 모드
              </h3>
            )}
            <span className="text-[11.5px] font-extrabold text-primary">
              {nickname ? "Premium 사용자" : "로그인이 필요합니다"}
            </span>
            <span className="text-[10px] text-slate-450 font-bold truncate">
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
            className="px-3 py-1.5 bg-white/50 hover:bg-white/80 border border-white/10 shadow-sm transition text-[11px] font-bold text-slate-500 rounded-lg flex items-center gap-1 cursor-pointer"
          >
            ✏️ 수정
          </button>
        ) : (
          <button
            onClick={onLogout} // Will trigger redirect to login view/action
            className="px-3.5 py-1.5 bg-primary hover:bg-primary/95 text-white text-[11px] font-extrabold rounded-lg transition shadow-sm cursor-pointer"
          >
            로그인
          </button>
        )}
      </section>

      {/* Customer Status Management */}
      <section className="flex flex-col gap-3 animate-slide-up">
        <div className="px-1">
          <h3 className="text-[16px] font-black text-slate-900">
            고객 상태 관리
          </h3>
        </div>
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between p-3.5 bg-white/20 hover:bg-white/35 rounded-xl border border-white/10 transition flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-rose-500"></span>
              <span className="text-[13px] font-bold text-slate-650">미컨택</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={statusLabels.none}
                onChange={(e) => updateStatusLabel("none", e.target.value)}
                className="bg-transparent border-0 outline-none text-right text-[12.5px] font-bold text-slate-700 max-w-[100px] border-b border-slate-300/20 focus:border-primary"
              />
              <span className="text-slate-400 font-bold text-[10px] ml-0.5">❯</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-white/20 hover:bg-white/35 rounded-xl border border-white/10 transition flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
              <span className="text-[13px] font-bold text-slate-650">컨택</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={statusLabels.contact}
                onChange={(e) => updateStatusLabel("contact", e.target.value)}
                className="bg-transparent border-0 outline-none text-right text-[12.5px] font-bold text-slate-700 max-w-[100px] border-b border-slate-300/20 focus:border-primary"
              />
              <span className="text-slate-400 font-bold text-[10px] ml-0.5">❯</span>
            </div>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-white/20 hover:bg-white/35 rounded-xl border border-white/10 transition flex-row gap-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500"></span>
              <span className="text-[13px] font-bold text-slate-650">완료</span>
            </div>
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={statusLabels.done}
                onChange={(e) => updateStatusLabel("done", e.target.value)}
                className="bg-transparent border-0 outline-none text-right text-[12.5px] font-bold text-slate-700 max-w-[100px] border-b border-slate-300/20 focus:border-primary"
              />
              <span className="text-slate-400 font-bold text-[10px] ml-0.5">❯</span>
            </div>
          </div>
        </div>
      </section>

      {/* Notifications Settings */}
      <section className="flex flex-col gap-3 animate-slide-up">
        <div className="px-1">
          <h3 className="text-[16px] font-black text-slate-900">
            알림 설정
          </h3>
        </div>
        <div className="glass-card p-4 flex flex-col gap-3">
          <div className="flex items-center justify-between p-3.5 bg-white/20 hover:bg-white/35 rounded-xl border border-white/10 transition">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13.5px] font-bold text-slate-700">방문 일정 알림</span>
              <span className="text-[10.5px] text-slate-450 font-semibold">방문 일정 시작 전 알림을 받습니다</span>
            </div>
            <button
              onClick={() => setIsAlertEnabled(!isAlertEnabled)}
              className={`w-11 h-6 rounded-full p-0.5 transition-colors cursor-pointer ${isAlertEnabled ? "bg-primary" : "bg-slate-300/50"
                }`}
            >
              <div
                className={`bg-white w-5 h-5 rounded-full shadow-sm transform transition-transform ${isAlertEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
              />
            </button>
          </div>

          <div className="flex items-center justify-between p-3.5 bg-white/20 hover:bg-white/35 rounded-xl border border-white/10 transition cursor-pointer">
            <div className="flex flex-col gap-0.5">
              <span className="text-[13.5px] font-bold text-slate-700">알림 시간</span>
              <span className="text-[10.5px] text-slate-450 font-semibold">방문 일정 시작 전 설정</span>
            </div>
            <div className="flex items-center gap-1.5 select-none">
              <select
                value={alertTime}
                onChange={(e) => setAlertTime(e.target.value)}
                className="outline-none bg-transparent font-bold text-[12.5px] text-slate-600 cursor-pointer text-right appearance-none mr-1"
              >
                <option value="10분 전">10분 전</option>
                <option value="30분 전">30분 전</option>
                <option value="1시간 전">1시간 전</option>
              </select>
              <span className="text-slate-400 font-bold text-[10px] ml-0.5">❯</span>
            </div>
          </div>
        </div>
      </section>

      {/* App Info Card */}
      <section className="flex flex-col gap-3 animate-slide-up">
        <div className="px-1">
          <h3 className="text-[16px] font-black text-slate-900">
            앱 정보
          </h3>
        </div>
        <div className="glass-card p-4 flex flex-col gap-1.5">
          <div className="flex items-center justify-between py-2.5 border-b border-white/10">
            <span className="text-[12.5px] font-bold text-slate-650">버전</span>
            <span className="text-[12.5px] font-bold text-slate-400">v1.0.0</span>
          </div>

          <a
            href="/privacy"
            className="flex items-center justify-between py-3 border-b border-white/10 hover:text-primary transition"
          >
            <span className="text-[12.5px] font-bold text-slate-650">개인정보처리방침</span>
            <span className="text-slate-400 font-bold text-[10px] ml-0.5">❯</span>
          </a>

          <a
            href="/terms"
            className="flex items-center justify-between py-3 border-b border-white/10 hover:text-primary transition"
          >
            <span className="text-[12.5px] font-bold text-slate-650">이용약관</span>
            <span className="text-slate-400 font-bold text-[10px] ml-0.5">❯</span>
          </a>

          <div className="flex items-center justify-between py-3 hover:text-primary transition cursor-pointer">
            <span className="text-[12.5px] font-bold text-slate-650">문의하기</span>
            <span className="text-slate-400 font-bold text-[10px] ml-0.5">❯</span>
          </div>
        </div>
      </section>

      {/* Logout Button */}
      {nickname && (
        <button
          onClick={onLogout}
          className="w-full py-4 bg-white/40 hover:bg-rose-500/10 border border-white/20 text-slate-600 hover:text-rose-500 font-extrabold text-[13.5px] rounded-2xl backdrop-blur-md transition shadow-sm cursor-pointer mt-1"
        >
          🚪 로그아웃
        </button>
      )}
    </div>
  );
}
