"use client";

import React from "react";

interface HeaderProps {
  isLoggedIn?: boolean;
  nickname?: string;
  onLoginClick?: () => void;
}

export default function Header({ isLoggedIn = false, nickname = "", onLoginClick }: HeaderProps) {
  return (
    <header className="flex justify-between items-center px-5 py-4 bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-slate-100/80">
      <div className="flex items-center gap-2 text-blue-600">
        <img src="/icon.png" alt="logo" className="w-5 h-5 object-contain" />
        <span className="font-extrabold text-[16px] text-slate-900 tracking-tight">
          외근의 정석
        </span>
      </div>

      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <div className="flex items-center gap-1.5 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100/60">
            <span className="text-[11px] font-bold text-blue-700">
              {nickname}님
            </span>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="text-[11.5px] font-bold text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded-full transition shadow-sm"
          >
            로그인
          </button>
        )}

        <button className="text-slate-500 hover:text-blue-600 transition p-1 relative flex items-center justify-center">
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-rose-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
