"use client";

import React, { useEffect, useRef, useState } from "react";
import { Customer } from "@/types";

interface KakaoMapProps {
  customers: Customer[];
}

export default function KakaoMap({ customers }: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);

  useEffect(() => {
    const checkScript = setInterval(() => {
      if (window.kakao && window.kakao.maps) {
        clearInterval(checkScript);
        setMapLoaded(true);
      }
    }, 100);

    return () => clearInterval(checkScript);
  }, []);

  useEffect(() => {
    if (!mapLoaded || !mapContainer.current) return;

    window.kakao.maps.load(() => {
      const validCustomers = customers.filter((c) => c.latitude && c.longitude);

      const defaultCenter =
        validCustomers.length > 0
          ? new window.kakao.maps.LatLng(
              validCustomers[0].latitude,
              validCustomers[0].longitude,
            )
          : new window.kakao.maps.LatLng(37.5665, 126.978);

      const options = {
        center: defaultCenter,
        level: 6,
      };

      const map = new window.kakao.maps.Map(mapContainer.current, options);

      validCustomers.forEach((customer) => {
        const markerPosition = new window.kakao.maps.LatLng(
          customer.latitude,
          customer.longitude,
        );
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
        });
        marker.setMap(map);

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        const tmapTarget = isMobile
          ? `tmap://route?goalx=${customer.longitude}&goaly=${customer.latitude}&goalname=${encodeURIComponent(customer.name)}`
          : `https://map.naver.com/v5/?lng=${customer.longitude}&lat=${customer.latitude}&title=${encodeURIComponent(customer.name)}&isCorrectAnswer=true`;

        const nmapTarget = isMobile
          ? `nmap://route?dlat=${customer.latitude}&dlng=${customer.longitude}&dname=${encodeURIComponent(customer.name)}&appname=sales_map`
          : `https://map.naver.com/v5/direction////${customer.longitude},${customer.latitude},${encodeURIComponent(customer.name)}/-/car`;

        // 💡 [주소 간략화 로직] '서울 강동구 고덕로98길 161 1304동 401호' -> '고덕로98길 161' 또는 아파트명 추출
        // 상세 주소(동·호수)가 나오기 전까지의 핵심 도로명/건물명 정보나 맨 뒤 콤마(,) 뒤의 아파트명을 우선 활용
        let shortAddress = customer.address;
        if (customer.address.includes(",")) {
          // 예: "...고덕동, 고덕아이파크" 에서 '고덕아이파크'만 쏙 파싱
          shortAddress =
            customer.address.split(",").pop()?.trim() || customer.address;
        } else {
          // 쉼표가 없는 일반 도로명 주소라면 시/도, 시/군/구 단어를 걷어내고 도로명과 건물번호 부분만 노출
          const words = customer.address.split(" ");
          if (words.length >= 3) {
            // '서울 강동구 고덕로98길 161' -> '고덕로98길 161' 형태로 단축
            shortAddress = words.slice(2, 5).join(" ");
          }
        }

        // 말풍선 내부 레이아웃 고도화 (이름과 쪼갠 간략 주소를 상하 flex 구조로 배치)
        const contentString = `
          <div style="padding:10px; min-width:160px; display:flex; flex-direction:column; gap:6px;">
            <div style="display:flex; flex-direction:column; gap:1px;">
              <div style="font-weight:bold; font-size:13px; color:#1e293b;">${customer.name} 고객님</div>
              <div style="font-size:11px; color:#64748b; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; max-width:140px;">${shortAddress}</div>
            </div>
            <div style="display:flex; gap:4px; margin-top:2px;">
              <a href="${tmapTarget}" ${!isMobile ? 'target="_blank"' : ""} style="flex:1; text-align:center; background-color:#3b82f6; color:white; font-size:11px; padding:4px 0; border-radius:4px; font-weight:500; text-decoration:none;">티맵</a>
              <a href="${nmapTarget}" ${!isMobile ? 'target="_blank"' : ""} style="flex:1; text-align:center; background-color:#10b981; color:white; font-size:11px; padding:4px 0; border-radius:4px; font-weight:500; text-decoration:none;">네이버</a>
            </div>
          </div>
        `;

        const infowindow = new window.kakao.maps.InfoWindow({
          content: contentString,
          removable: true,
        });

        window.kakao.maps.event.addListener(marker, "click", () => {
          infowindow.open(map, marker);
        });
      });
    });
  }, [mapLoaded, customers]);

  return (
    <div className="flex flex-col gap-2 bg-white p-4 rounded-xl shadow-sm border border-slate-100">
      <div className="text-sm font-bold text-slate-800">영업 동선 지도</div>
      <div
        ref={mapContainer}
        className="w-full h-72 bg-slate-100 rounded-lg border border-slate-200/60"
      />
    </div>
  );
}
