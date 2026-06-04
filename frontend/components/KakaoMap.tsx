"use client";

import React, { useEffect, useRef, useState } from "react";
import { Customer } from "@/types";

interface KakaoMapProps {
  customers: Customer[];
  isFullScreen?: boolean;
  onExpand?: () => void;
  backendIp: string; // 💡 API 통신용 IP 받기
}

export default function KakaoMap({
  customers,
  isFullScreen = false,
  onExpand,
  backendIp,
}: KakaoMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const markerMapRef = useRef<{
    [key: number]: { marker: any; popup: any; label: any };
  }>({});

  useEffect(() => {
    const checkScript = setInterval(() => {
      if (window.kakao && window.kakao.maps) {
        clearInterval(checkScript);
        setMapLoaded(true);
      }
    }, 100);

    (window as any).handleNaviMap = (
      type: string,
      lng: number,
      lat: number,
      name: string,
    ) => {
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      if (type === "tmap") {
        if (isMobile)
          window.location.href = `tmap://route?goalx=${lng}&goaly=${lat}&goalname=${encodeURIComponent(name)}`;
        else
          window.open(
            `https://map.naver.com/v5/?lng=${lng}&lat=${lat}&title=${encodeURIComponent(name)}`,
            "_blank",
          );
      } else {
        if (isMobile)
          window.location.href = `nmap://route?dlat=${lat}&dlng=${lng}&dname=${encodeURIComponent(name)}`;
        else
          window.open(
            `https://map.naver.com/v5/direction////${lng},${lat},${encodeURIComponent(name)}/-/car`,
            "_blank",
          );
      }
    };

    // 💡 DB에 실시간 저장 로직 추가
    (window as any).changeMarkerStatus = async (id: number, status: string) => {
      const target = markerMapRef.current[id];
      if (target && target.marker) {
        let imgSrc = "/images/marker_uncontacted.png";
        if (status === "컨택") imgSrc = "/images/marker_contacted.png";
        if (status === "완료") imgSrc = "/images/marker_completed.png";

        const newImage = new window.kakao.maps.MarkerImage(
          imgSrc,
          new window.kakao.maps.Size(20, 20),
        );
        target.marker.setImage(newImage);
      }

      const protocol =
        process.env.NODE_ENV === "development" ? "http" : "https";
      try {
        const token = localStorage.getItem("token"); // 👈 토큰 꺼내기
        await fetch(`${protocol}://${backendIp}/api/customers/${id}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`, // 👈 추가
          },
          body: JSON.stringify({ status }),
        });
      } catch (error) {
        console.error("상태 업데이트 실패:", error);
      }
    };

    (window as any).closeMarkerPopup = (id: number) => {
      const target = markerMapRef.current[id];
      if (target && target.popup) {
        target.popup.setMap(null);
      }
    };

    return () => clearInterval(checkScript);
  }, [backendIp]);

  useEffect(() => {
    if (!mapLoaded || !mapContainer.current) return;
    window.kakao.maps.load(() => {
      const validCustomers = customers.filter((c) => c.latitude && c.longitude);

      Object.values(markerMapRef.current).forEach(
        ({ marker, popup, label }) => {
          marker.setMap(null);
          if (popup) popup.setMap(null);
          if (label) label.setMap(null);
        },
      );
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
          level: isFullScreen ? 7 : 6,
        });
      }

      const bounds = new window.kakao.maps.LatLngBounds();

      validCustomers.forEach((customer) => {
        const markerPosition = new window.kakao.maps.LatLng(
          customer.latitude,
          customer.longitude,
        );

        // 💡 DB에서 가져온 상태값 반영
        const currentStatus = customer.status || "미컨택";

        let defaultImgSrc = "/images/marker_uncontacted.png";
        if (currentStatus === "컨택")
          defaultImgSrc = "/images/marker_contacted.png";
        if (currentStatus === "완료")
          defaultImgSrc = "/images/marker_completed.png";

        const markerImage = new window.kakao.maps.MarkerImage(
          defaultImgSrc,
          new window.kakao.maps.Size(20, 20),
        );
        const marker = new window.kakao.maps.Marker({
          position: markerPosition,
          image: markerImage,
        });
        marker.setMap(mapRef.current);
        bounds.extend(markerPosition);

        const labelContent = `<div style="font-size:12px; font-weight:500; color:#21262e; text-shadow:-1px -1px 0 #fff, 1px -1px 0 #fff, -1px 1px 0 #fff, 1px 1px 0 #fff; transform:translateY(1px); white-space:nowrap; letter-spacing:-0.5px;">${customer.name}</div>`;
        const labelOverlay = new window.kakao.maps.CustomOverlay({
          position: markerPosition,
          content: labelContent,
          yAnchor: 0,
        });
        labelOverlay.setMap(mapRef.current);

        // 💡 DB에서 가져온 전화번호 연결 (없으면 빈칸)
        const phoneLink = customer.phone ? customer.phone : "";

        const isNoneChecked = currentStatus === "미컨택" ? "checked" : "";
        const isContactChecked = currentStatus === "컨택" ? "checked" : "";
        const isDoneChecked = currentStatus === "완료" ? "checked" : "";

        const contentString = `
          <div class="custom-popup">
            <button class="custom-popup-close" onclick="window.closeMarkerPopup(${customer.id})">✕</button>
            
            <div style="display:flex; align-items:center; justify-content:space-between; margin-bottom:8px; padding-right:20px;">
              <span style="font-weight:900; font-size:14px; color:#0f172a; max-width:85px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${customer.name}</span>
              <div style="display:flex; gap:4px;">
                <a href="tel:${phoneLink}" class="circle-btn phone-btn" title="전화">📞</a>
                <button onclick="window.handleNaviMap('tmap', ${customer.longitude}, ${customer.latitude}, '${customer.name}')" class="circle-btn tmap-btn" title="티맵">T</button>
                <button onclick="window.handleNaviMap('nmap', ${customer.longitude}, ${customer.latitude}, '${customer.name}')" class="circle-btn nmap-btn" title="네이버">N</button>
              </div>
            </div>
            
            <div style="font-size:11px; color:#64748b; line-height:1.4; margin-bottom:12px; white-space:normal; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
              ${customer.address}
            </div>

            <div class="map-status-selector">
              <input type="radio" id="status_none_${customer.id}" name="status_${customer.id}" value="미컨택" ${isNoneChecked} onclick="window.changeMarkerStatus(${customer.id}, '미컨택')">
              <label for="status_none_${customer.id}">미컨택</label>
              
              <input type="radio" id="status_contact_${customer.id}" name="status_${customer.id}" value="컨택" ${isContactChecked} onclick="window.changeMarkerStatus(${customer.id}, '컨택')">
              <label for="status_contact_${customer.id}">컨택</label>
              
              <input type="radio" id="status_done_${customer.id}" name="status_${customer.id}" value="완료" ${isDoneChecked} onclick="window.changeMarkerStatus(${customer.id}, '완료')">
              <label for="status_done_${customer.id}">완료</label>
            </div>
          </div>
        `;

        const popupOverlay = new window.kakao.maps.CustomOverlay({
          content: contentString,
          position: markerPosition,
          xAnchor: 0.5,
          yAnchor: 1,
          zIndex: 10,
        });

        markerMapRef.current[customer.id] = {
          marker,
          popup: popupOverlay,
          label: labelOverlay,
        };

        window.kakao.maps.event.addListener(marker, "click", () => {
          Object.values(markerMapRef.current).forEach(({ popup: p }) =>
            p.setMap(null),
          );
          popupOverlay.setMap(mapRef.current);
          mapRef.current.panTo(markerPosition);
        });
      });

      if (validCustomers.length > 0 && mapRef.current)
        mapRef.current.setBounds(bounds);

      (window as any).focusCustomerMarker = (id: number) => {
        const target = markerMapRef.current[id];
        if (!target || !mapRef.current) return;
        Object.values(markerMapRef.current).forEach(({ popup: p }) =>
          p.setMap(null),
        );
        mapRef.current.panTo(target.marker.getPosition());
        target.popup.setMap(mapRef.current);
      };
    });
  }, [mapLoaded, customers, isFullScreen]);

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .custom-popup { background: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 12px 14px; width: 220px; position: relative; bottom: 8px; border: 1px solid #e2e8f0; font-family: sans-serif; box-sizing: border-box; }
        .custom-popup::after { content: ''; position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); border-width: 6px 6px 0; border-style: solid; border-color: white transparent transparent transparent; }
        
        .custom-popup-close { position: absolute; right: 8px; top: 8px; width: 20px; height: 20px; background: transparent; border: none; font-size: 13px; font-weight: bold; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; }
        .custom-popup-close:hover { color: #334155; }
        
        .circle-btn { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; text-decoration: none; cursor: pointer; border: 1px solid transparent; padding: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .phone-btn { background: #f8fafc; border-color: #e2e8f0; color: #475569; }
        .tmap-btn { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
        .nmap-btn { background: #ecfdf5; border-color: #a7f3d0; color: #10b981; }

        .map-status-selector { display: flex; gap: 2px; background: #f1f5f9; padding: 2px; border-radius: 6px; }
        .map-status-selector input[type="radio"] { display: none; }
        .map-status-selector label { flex: 1; text-align: center; font-size: 10px; font-weight: 700; padding: 4px 0; border-radius: 4px; cursor: pointer; color: #94a3b8; transition: all 0.2s ease; }
        
        .map-status-selector input[value="미컨택"]:checked + label { background: #ef4444; color: #fff; box-shadow: 0 1px 3px rgba(239,68,68,0.3); }
        .map-status-selector input[value="컨택"]:checked + label { background: #eab308; color: #fff; box-shadow: 0 1px 3px rgba(234,179,8,0.3); }
        .map-status-selector input[value="완료"]:checked + label { background: #3b82f6; color: #fff; box-shadow: 0 1px 3px rgba(59,130,246,0.3); }
      `,
        }}
      />

      {isFullScreen ? (
        <div ref={mapContainer} className="w-full h-full bg-slate-100" />
      ) : (
        <div className="flex flex-col gap-4 p-5 bg-white rounded-2xl shadow-sm border border-slate-100">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="#2563eb"
                strokeWidth="2"
                className="bg-blue-50 p-1 rounded-md"
              >
                <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
              <h3 className="text-base font-bold text-slate-800">
                영업 동선 지도
              </h3>
            </div>
            <button
              onClick={onExpand}
              className="flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-100"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <path d="M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z"></path>
              </svg>
              전체 보기
            </button>
          </div>
          <div
            ref={mapContainer}
            className="w-full h-64 bg-slate-100 rounded-xl shadow-inner border border-slate-200 overflow-hidden relative"
          />
        </div>
      )}
    </>
  );
}
