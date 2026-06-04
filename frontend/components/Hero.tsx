"use client";

import React from "react";

export default function Hero() {
  return (
    <section className="relative flex flex-col justify-between bg-white rounded-2xl shadow-sm overflow-hidden min-h-[320px]">
      <img
        src="/images/hero-image.png"
        alt="hero"
        className="absolute inset-0 w-full h-full object-cover object-right"
      />
      <div className="absolute inset-0 bg-gradient-to-r from-white/95 via-white/80 to-transparent w-[75%]"></div>

      <div className="relative z-10 flex flex-col gap-1 p-5 pt-6">
        <h1 className="text-3xl font-black text-slate-900 tracking-tight">
          외근의 정석
        </h1>
        <p className="text-xs text-slate-600 font-medium leading-relaxed mt-1">
          위치 기반 동선 관리로
          <br />
          매일 더 스마트한 외근을 시작하세요
        </p>
      </div>

      <div className="relative z-10 flex flex-col gap-2 px-5 pb-6 w-[65%]">
        {[
          {
            title: "최적 경로 추천",
            desc: "시간과 거리를 동시에 최적화",
            icon: "🎯",
          },
          { title: "고객 위치 관리", desc: "지도에서 한눈에 확인", icon: "🗺️" },
          { title: "실적 분석", desc: "데이터로 성과를 높이세요", icon: "📊" },
        ].map((item, i) => (
          <div
            key={i}
            className="flex items-center gap-2.5 bg-white/90 backdrop-blur-sm p-2 rounded-xl shadow-sm border border-white"
          >
            <div className="w-7 h-7 shrink-0 rounded-full bg-blue-50 flex items-center justify-center text-xs shadow-inner">
              {item.icon}
            </div>
            <div className="flex flex-col min-w-0">
              <span className="text-[11px] font-bold text-slate-800 truncate">
                {item.title}
              </span>
              <span className="text-[9px] text-slate-500 truncate">
                {item.desc}
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
