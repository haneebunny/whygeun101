"use client";

import React, { useEffect, useRef, useState } from "react";
import { Customer } from "../src/domain/entities/types";
import { customerRepository } from "../src/data/repositories/customerApi";
import "./kakaoMap.css";
import { useGeolocation } from "./hooks/useGeolocation";
import {
  extractBuildingName,
  getLabelHTML,
  generateSingleHTML,
  generateGroupItemHTML,
  getMajorityStatus,
} from "./utils/mapHtmlTemplates";

interface KakaoMapProps {
  customers: Customer[];
  isFullScreen?: boolean;
  onExpand?: () => void;
  backendIp: string;
  onVisibleCustomersChange?: (ids: number[]) => void;
}

export default function KakaoMap({
  customers,
  isFullScreen = false,
  onExpand,
  backendIp,
  onVisibleCustomersChange,
}: KakaoMapProps) {
  const isFirstLoadRef = useRef(true);
  const mapContainer = useRef<HTMLDivElement>(null);
  const [mapLoaded, setMapLoaded] = useState(false);
  const mapRef = useRef<any>(null);
  const markerMapRef = useRef<{
    [groupId: string]: { marker: any; popup: any; type: string };
  }>({});
  const customerToGroupRef = useRef<{ [customerId: number]: string }>({});

  // 💡 상태를 실시간으로 기억하는 장부!
  const groupStatusesRef = useRef<{
    [groupId: string]: { [id: number]: string };
  }>({});

  const overlaysRef = useRef<any[]>([]);
  const openedPopupGroupIdRef = useRef<string | null>(null);

  const { isTracking, toggleLocationTracking, clearTracking } =
    useGeolocation(mapRef);

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

    (window as any).changeMarkerStatus = async (
      id: number,
      status: string,
      groupId: string,
    ) => {
      if ((window as any).reactUpdateStatusHook) {
        (window as any).reactUpdateStatusHook(id, status);
      }
    };

    (window as any).reactToggleFavoriteFromMap = (id: number, favorite: boolean) => {
      if ((window as any).reactToggleFavoriteHook) {
        (window as any).reactToggleFavoriteHook(id, favorite);
      }
    };

    (window as any).reactToggleAbsentFromMap = (id: number, absent: boolean) => {
      if ((window as any).reactToggleAbsentHook) {
        (window as any).reactToggleAbsentHook(id, absent);
      }
    };

    (window as any).reactEditTimeFromMap = (id: number, currentVal: string) => {
      if ((window as any).reactEditTimeHook) {
        (window as any).reactEditTimeHook(id, currentVal);
      }
    };

    (window as any).openMapPopup = (groupId: string) => {
      if (!mapRef.current) return;
      Object.values(markerMapRef.current).forEach(({ popup }) =>
        popup.setMap(null),
      );
      openedPopupGroupIdRef.current = groupId;
      const target = markerMapRef.current[groupId];
      if (target && target.popup) {
        target.popup.setMap(mapRef.current);
        mapRef.current.panTo(target.marker.getPosition());
      }
    };

    (window as any).closeMapPopup = (groupId: string) => {
      const target = markerMapRef.current[groupId];
      if (target && target.popup) target.popup.setMap(null);
      if (openedPopupGroupIdRef.current === groupId) {
        openedPopupGroupIdRef.current = null;
      }
    };

    (window as any).toggleGroupItem = (id: number) => {
      const body = document.getElementById(`group_body_${id}`);
      const arrow = document.getElementById(`group_arrow_${id}`);
      if (body && arrow) {
        if (body.style.display === "none") {
          body.style.display = "block";
          arrow.style.transform = "rotate(180deg)";
        } else {
          body.style.display = "none";
          arrow.style.transform = "rotate(0deg)";
        }
      }
    };

    (window as any).focusCustomerMarker = (id: number) => {
      const groupId = customerToGroupRef.current[id];
      if (groupId) {
        (window as any).openMapPopup(groupId);
        setTimeout(() => {
          const body = document.getElementById(`group_body_${id}`);
          if (body && body.style.display === "none")
            (window as any).toggleGroupItem(id);
        }, 100);
      }
    };

    return () => {
      clearInterval(checkScript);
      clearTracking();
    };
  }, [backendIp]);

  useEffect(() => {
    if (!mapLoaded || !mapContainer.current) return;
    window.kakao.maps.load(() => {
      const validCustomers = customers.filter((c) => c.latitude && c.longitude);

      // Clean up previous custom overlays and native markers
      overlaysRef.current.forEach((o) => {
        if (o && o.setMap) o.setMap(null);
      });
      overlaysRef.current = [];

      Object.values(markerMapRef.current).forEach(({ marker, popup }) => {
        if (marker && marker.setMap) marker.setMap(null);
        if (popup && popup.setMap) popup.setMap(null);
      });
      markerMapRef.current = {};
      customerToGroupRef.current = {};
      groupStatusesRef.current = {};

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

        // Add idle event listener once when map is initialized
        if (onVisibleCustomersChange) {
          const reportVisible = () => {
            if (!mapRef.current) return;
            const mapBounds = mapRef.current.getBounds();
            const sw = mapBounds.getSouthWest();
            const ne = mapBounds.getNorthEast();

            const visibleIds = validCustomers
              .filter((c) => {
                const lat = c.latitude!;
                const lng = c.longitude!;
                return (
                  lat >= sw.getLat() &&
                  lat <= ne.getLat() &&
                  lng >= sw.getLng() &&
                  lng <= ne.getLng()
                );
              })
              .map((c) => c.id);

            onVisibleCustomersChange(visibleIds);
          };

          window.kakao.maps.event.addListener(mapRef.current, "idle", reportVisible);
          // Initial trigger
          setTimeout(reportVisible, 500);
        }
      }

      const bounds = new window.kakao.maps.LatLngBounds();
      const grouped: { [key: string]: Customer[] } = {};
      validCustomers.forEach((c) => {
        const key = `${c.latitude.toFixed(5)}_${c.longitude.toFixed(5)}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
      });

      Object.values(grouped).forEach((group, index) => {
        const groupId = `group_${index}`;
        const markerPosition = new window.kakao.maps.LatLng(
          group[0].latitude,
          group[0].longitude,
        );
        bounds.extend(markerPosition);

        if (!groupStatusesRef.current[groupId])
          groupStatusesRef.current[groupId] = {};
        group.forEach((c) => {
          customerToGroupRef.current[c.id] = groupId;
          groupStatusesRef.current[groupId][c.id] = c.status || "미컨택";
        });

        if (group.length === 1) {
          const customer = group[0];
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
          const markerOverlay = new window.kakao.maps.Marker({
            position: markerPosition,
            image: markerImage,
            opacity: customer.absent ? 0.5 : 1.0,
            zIndex: customer.absent ? 4 : 3,
          });
          markerOverlay.setMap(mapRef.current);
          overlaysRef.current.push(markerOverlay);

          const labelOverlay = new window.kakao.maps.CustomOverlay({
            position: markerPosition,
            content: getLabelHTML(customer),
            yAnchor: -0.2,
            zIndex: customer.absent ? 2 : 1,
          });
          labelOverlay.setMap(mapRef.current);
          overlaysRef.current.push(labelOverlay);

          const popupOverlay = new window.kakao.maps.CustomOverlay({
            content: generateSingleHTML(customer, groupId),
            position: markerPosition,
            xAnchor: 0.5,
            yAnchor: 1.1,
            zIndex: 20,
            clickable: true,
          });

          markerMapRef.current[groupId] = {
            marker: markerOverlay,
            popup: popupOverlay,
            type: "single",
          };
          window.kakao.maps.event.addListener(markerOverlay, "click", () => {
            (window as any).openMapPopup(groupId);
            if ((window as any).reactSelectCustomer) {
              (window as any).reactSelectCustomer(customer.id);
            }
          });
        } else {
          const majorityStatus = getMajorityStatus(group);
          let bubbleColor = "#ef4444";
          let imgSrc = "/images/marker_uncontacted.png";
          if (majorityStatus === "컨택") {
            bubbleColor = "#eab308";
            imgSrc = "/images/marker_contacted.png";
          } else if (majorityStatus === "완료") {
            bubbleColor = "#3b82f6";
            imgSrc = "/images/marker_completed.png";
          }

          // 💡 1. 뾰족한 진짜 마커(핀)를 지도에 꽂기! (안 사라지게 네이티브로!)
          const markerImage = new window.kakao.maps.MarkerImage(
            imgSrc,
            new window.kakao.maps.Size(20, 20),
          );
          const anyAbsent = group.some((c) => c.absent);
          const markerOverlay = new window.kakao.maps.Marker({
            position: markerPosition,
            image: markerImage,
            opacity: anyAbsent ? 0.5 : 1.0,
            zIndex: anyAbsent ? 4 : 3,
          });
          markerOverlay.setMap(mapRef.current);
          overlaysRef.current.push(markerOverlay);

          // 💡 2. 그 머리 위에 말풍선(숫자)을 띄우기 (translateY(-20px)로 위로 밀어올림)
          const bubbleStyle = `color: ${bubbleColor}; border-color: ${bubbleColor};`;
          const tailStyle = `border-bottom-color: ${bubbleColor}; border-right-color: ${bubbleColor};`;
          const groupBubbleContent = `
            <div class="custom-group-bubble" onclick="window.openMapPopup('${groupId}')" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; transform: translateY(-20px);">
              <div class="group-bubble" id="group_bubble_${groupId}" style="${bubbleStyle}">
                ${group.length}
                <div class="bubble-tail" id="group_tail_${groupId}" style="${tailStyle}"></div>
              </div>
            </div>
          `;
          const bubbleOverlay = new window.kakao.maps.CustomOverlay({
            position: markerPosition,
            content: groupBubbleContent,
            yAnchor: 1,
            xAnchor: 0.5,
            zIndex: anyAbsent ? 9 : 8,
            clickable: true,
          });
          bubbleOverlay.setMap(mapRef.current);
          overlaysRef.current.push(bubbleOverlay);

          const listHTML = group
            .map((c) => generateGroupItemHTML(c, groupId))
            .join("");
          const popupContent = `
            <div class="custom-popup group-popup" onwheel="event.stopPropagation()" ontouchmove="event.stopPropagation()" onmousedown="event.stopPropagation()">
              <div class="group-popup-header">
                <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 170px;" title="${group[0].address}">
                  📍 ${extractBuildingName(group[0].address)} (${group.length}명)
                </span>
                <button onclick="window.closeMapPopup('${groupId}')">✕</button>
              </div>
              <div class="group-popup-list">${listHTML}</div>
            </div>
          `;
          const popupOverlay = new window.kakao.maps.CustomOverlay({
            content: popupContent,
            position: markerPosition,
            xAnchor: 0.5,
            yAnchor: 1.1,
            zIndex: 20,
            clickable: true,
          });

          // 💡 마커(핀)를 클릭해도 팝업이 열리도록 설정!
          window.kakao.maps.event.addListener(markerOverlay, "click", () => {
            (window as any).openMapPopup(groupId);
            if ((window as any).reactSelectCustomer && group.length > 0) {
              (window as any).reactSelectCustomer(group[0].id);
            }
          });

          markerMapRef.current[groupId] = {
            marker: markerOverlay,
            popup: popupOverlay,
            type: "group",
          };
        }
      });

      // Restore previously open popup
      if (openedPopupGroupIdRef.current) {
        const target = markerMapRef.current[openedPopupGroupIdRef.current];
        if (target && target.popup) {
          target.popup.setMap(mapRef.current);
        }
      }

      if (validCustomers.length > 0 && mapRef.current && isFirstLoadRef.current) {
        mapRef.current.setBounds(bounds);
        isFirstLoadRef.current = false;
      }
    });
  }, [mapLoaded, customers, isFullScreen]);

  return (
    <>
      {isFullScreen ? (
        <div ref={mapContainer} className="w-full h-full bg-slate-100 relative">
          <button
            onClick={toggleLocationTracking}
            className={`absolute bottom-6 right-4 z-10 w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-colors ${isTracking ? "bg-blue-600 text-white" : "bg-white text-slate-700"}`}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
            >
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="3" />
            </svg>
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-4 p-5 bg-white rounded-2xl shadow-sm border border-slate-100 relative">
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
              </svg>{" "}
              전체 보기
            </button>
          </div>

          <div
            ref={mapContainer}
            className="w-full h-[360px] bg-slate-100 rounded-xl shadow-inner border border-slate-200 overflow-hidden relative"
          >
            <button
              onClick={toggleLocationTracking}
              className={`absolute bottom-4 right-4 z-10 w-10 h-10 rounded-full flex items-center justify-center shadow-md transition-colors ${isTracking ? "bg-blue-600 text-white" : "bg-white text-slate-600 border border-slate-200 hover:bg-slate-50"}`}
              title="내 위치 추적"
            >
              <svg
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="12" r="10" />
                <circle cx="12" cy="12" r="3" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </>
  );
}
