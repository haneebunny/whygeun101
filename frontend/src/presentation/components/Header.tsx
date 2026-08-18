"use client";

import React from "react";

interface HeaderProps {
  isLoggedIn?: boolean;
  nickname?: string;
  onLoginClick?: () => void;
  isHidden?: boolean;
}

export default function Header({
  isLoggedIn = false,
  nickname = "",
  onLoginClick,
  isHidden = false,
}: HeaderProps) {
  return (
    <header
      className={`flex justify-between items-center px-5 glass-header sticky top-0 z-50 transition-all duration-300 transform overflow-hidden ${
        isHidden
          ? "-translate-y-full opacity-0 max-h-0 py-0 border-b-0 pointer-events-none"
          : "translate-y-0 opacity-100 max-h-20 py-3"
      }`}
    >
      <div className="flex items-center gap-2.5 text-primary">
        <img src="/icon.png" alt="logo" className="w-5.5 h-5.5 object-contain" />
        <span className="font-extrabold text-[17px] text-slate-900 tracking-tight">
          모두의 외근
        </span>
      </div>

      <div className="flex items-center gap-3">
        {isLoggedIn ? (
          <div className="flex items-center gap-1.5 bg-primary/10 px-3 py-1 rounded-full border border-primary/20 backdrop-blur-sm">
            <span className="text-[11.5px] font-extrabold text-primary">
              {nickname}님
            </span>
          </div>
        ) : (
          <button
            onClick={onLoginClick}
            className="text-[12.5px] font-black text-primary bg-primary/10 hover:bg-primary/20 border border-primary/20 backdrop-blur-sm px-4.5 py-1.5 rounded-full transition shadow-sm"
          >
            로그인
          </button>
        )}

        <button className="w-9 h-9 rounded-full bg-white/50 border border-slate-200/20 shadow-sm flex items-center justify-center text-slate-700 hover:text-primary transition relative">
          <svg
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
            <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
          </svg>
          <span className="absolute top-2 right-2.5 w-1.5 h-1.5 bg-rose-500 rounded-full"></span>
        </button>
      </div>
    </header>
  );
}
