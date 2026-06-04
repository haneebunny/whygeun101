"use client";

import React from "react";

interface BottomNavProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function BottomNav({ activeTab, setActiveTab }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 w-full max-w-md bg-white border-t border-slate-100 flex justify-around items-center px-4 py-3 pb-8 shadow-[0_-4px_20px_rgba(0,0,0,0.03)] z-50">
      <button
        onClick={() => setActiveTab("home")}
        className={`flex flex-col items-center gap-1 w-16 ${activeTab === "home" ? "text-blue-600" : "text-slate-400"}`}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill={activeTab === "home" ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
          <polyline points="9 22 9 12 15 12 15 22"></polyline>
        </svg>
        <span className="text-[10px] font-semibold">홈</span>
      </button>

      <button
        onClick={() => setActiveTab("map")}
        className={`flex flex-col items-center gap-1 w-16 ${activeTab === "map" ? "text-blue-600" : "text-slate-400"}`}
      >
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21"></polygon>
          <line x1="9" y1="3" x2="9" y2="21"></line>
          <line x1="15" y1="3" x2="15" y2="21"></line>
        </svg>
        <span className="text-[10px] font-semibold">지도</span>
      </button>

      <button className="flex flex-col items-center gap-1 text-slate-400 w-16">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
        <span className="text-[10px] font-semibold">고객</span>
      </button>

      <button className="flex flex-col items-center gap-1 text-slate-400 w-16">
        <svg
          width="22"
          height="22"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
        >
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <span className="text-[10px] font-semibold">분석</span>
      </button>
    </nav>
  );
}
