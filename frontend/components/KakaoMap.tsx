"use client";

import React, { useEffect, useRef, useState } from "react";
import { Customer } from "@/types";

interface KakaoMapProps {
  customers: Customer[];
}

export default function KakaoMap({ customers }: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState<boolean>(false);
  const mapRef = useRef<any>(null);

  // 💡 [핵심 추가] ID별로 마커와 인포윈도우를 1:1 매핑하여 보관할 딕셔너리 객체
  const markerMapRef = useRef<{
    [key: number]: { marker: any; infowindow: any };
  }>({});

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

      // 기존 마커 및 인포윈도우 클리어 소거
      Object.values(markerMapRef.current).forEach(({ marker, infowindow }) => {
        marker.setMap(null);
        infowindow.close();
      });
      markerMapRef.current = {};

      const defaultCenter =
        validCustomers.length > 0
          ? new window.kakao.maps.LatLng(
              validCustomers[0].latitude,
              validCustomers[0].longitude,
            )
          : new window.kakao.maps.LatLng(37.5665, 126.978);

      if (!mapRef.current) {
        mapRef.current = new window.kakao.maps.Map(mapContainer.current, {
          center: defaultCenter,
          level: 6,
        });
      }

      const bounds = new window.kakao.maps.LatLngBounds();

      validCustomers.forEach((customer) => {
        const markerPosition = new window.kakao.maps.LatLng(
          customer.latitude,
          customer.longitude,
        );
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
        });
        marker.setMap(mapRef.current);
        bounds.extend(markerPosition);

        const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

        const tmapTarget = isMobile
          ? `tmap://route?goalx=${customer.longitude}&goaly=${customer.latitude}&goalname=${encodeURIComponent(customer.name)}`
          : `https://map.naver.com/v5/?lng=${customer.longitude}&lat=${customer.latitude}&title=${encodeURIComponent(customer.name)}&isCorrectAnswer=true`;

        const nmapTarget = isMobile
          ? `nmap://route?dlat=${customer.latitude}&dlng=${customer.longitude}&dname=${encodeURIComponent(customer.name)}&appname=sales_map`
          : `https://map.naver.com/v5/direction////${customer.longitude},${customer.latitude},${encodeURIComponent(customer.name)}/-/car`;

        let shortAddress = customer.address;
        if (customer.address.includes(",")) {
          shortAddress =
            customer.address.split(",").pop()?.trim() || customer.address;
        } else {
          const words = customer.address.split(" ");
          if (words.length >= 3) {
            shortAddress = words.slice(2, 5).join(" ");
          }
        }

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
            <button 
              onclick="window.handleDeleteCustomer(${customer.id})" 
              style="width:100%; margin-top:2px; padding:4px 0; font-size:11px; background-color:#ef4444; color:white; border:none; border-radius:4px; font-weight:500; cursor:pointer;"
            >
              ❌ 지도에서 제거
            </button>
          </div>
        `;

        const infowindow = new window.kakao.maps.InfoWindow({
          content: contentString,
          removable: true,
        });

        // 💡 딕셔너리 참조 객체에 ID를 키값으로 핀 데이터 보관
        markerMapRef.current[customer.id] = { marker, infowindow };

        // 마커 개별 클릭 이벤트
        window.kakao.maps.event.addListener(marker, "click", () => {
          Object.values(markerMapRef.current).forEach(({ infowindow: iw }) =>
            iw.close(),
          );
          infowindow.open(mapRef.current, marker);
        });
      });

      if (validCustomers.length > 0 && mapRef.current) {
        mapRef.current.setBounds(bounds);
      }

      // 💡 [핵심 치트키] 외부 목록 클릭 시 실행될 전역 마커 포커싱 함수 등록
      (window as any).focusCustomerMarker = (id: number) => {
        const target = markerMapRef.current[id];
        if (!target || !mapRef.current) return;

        const { marker, infowindow } = target;

        // 1. 모든 인포윈도우 일괄 닫기
        Object.values(markerMapRef.current).forEach(({ infowindow: iw }) =>
          iw.close(),
        );

        // 2. 해당 마커 위치로 부드럽게 지도 중심 이동
        mapRef.current.panTo(marker.getPosition());

        // 3. 말풍선 팝업 열기
        infowindow.open(mapRef.current, marker);
      };
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
