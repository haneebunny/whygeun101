"use client";

import React, { useEffect, useRef, useState } from "react";
import { Customer } from "@/types";

interface KakaoMapProps {
  customers: Customer[];
  isFullScreen?: boolean;
  onExpand?: () => void;
  backendIp: string;
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
    [groupId: string]: { marker: any; popup: any; type: string };
  }>({});
  const customerToGroupRef = useRef<{ [customerId: number]: string }>({});

  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const myLocMarkerRef = useRef<any>(null);

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
      const target = markerMapRef.current[groupId];
      if (target && target.type === "single" && target.marker.setImage) {
        let imgSrc = "/images/marker_uncontacted.png";
        if (status === "컨택") imgSrc = "/images/marker_contacted.png";
        if (status === "완료") imgSrc = "/images/marker_completed.png";
        const newImage = new window.kakao.maps.MarkerImage(
          imgSrc,
          new window.kakao.maps.Size(20, 20),
        );
        target.marker.setImage(newImage);
      }

      const badge = document.getElementById(`badge_${id}`);
      if (badge) {
        badge.innerText = status;
        badge.className = `group-status-badge ${status === "완료" ? "done" : status === "컨택" ? "contact" : "none"}`;
      }

      const protocol =
        process.env.NODE_ENV === "development" ? "http" : "https";
      try {
        const token = localStorage.getItem("token");
        await fetch(`${protocol}://${backendIp}/api/customers/${id}/status`, {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ status }),
        });
      } catch (error) {
        console.error("상태 업데이트 실패:", error);
      }
    };

    (window as any).openMapPopup = (groupId: string) => {
      if (!mapRef.current) return;
      Object.values(markerMapRef.current).forEach(({ popup }) =>
        popup.setMap(null),
      );

      const target = markerMapRef.current[groupId];
      if (target && target.popup) {
        target.popup.setMap(mapRef.current);
        const position = target.marker.getPosition();
        mapRef.current.panTo(position);
      }
    };

    (window as any).closeMapPopup = (groupId: string) => {
      const target = markerMapRef.current[groupId];
      if (target && target.popup) target.popup.setMap(null);
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
          if (body && body.style.display === "none") {
            (window as any).toggleGroupItem(id);
          }
        }, 100);
      }
    };

    return () => {
      clearInterval(checkScript);
      if (watchIdRef.current)
        navigator.geolocation.clearWatch(watchIdRef.current);
    };
  }, [backendIp]);

  useEffect(() => {
    if (!mapLoaded || !mapContainer.current) return;
    window.kakao.maps.load(() => {
      const validCustomers = customers.filter((c) => c.latitude && c.longitude);

      Object.values(markerMapRef.current).forEach(({ marker, popup }) => {
        marker.setMap(null);
        if (popup) popup.setMap(null);
      });
      markerMapRef.current = {};
      customerToGroupRef.current = {};

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

      const grouped: { [key: string]: Customer[] } = {};
      validCustomers.forEach((c) => {
        const key = `${c.latitude.toFixed(5)}_${c.longitude.toFixed(5)}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(c);
      });

      const extractBuildingName = (address: string) => {
        if (!address) return "같은 주소 고객";
        const parenMatch = address.match(/\(([^)]+)\)/);
        if (parenMatch) {
          const parts = parenMatch[1].split(",");
          const possibleName = parts[parts.length - 1].trim();
          if (
            !possibleName.endsWith("동") &&
            !possibleName.endsWith("읍") &&
            !possibleName.endsWith("면")
          )
            return possibleName;
        }
        const words = address.split(" ");
        const lastWord = words[words.length - 1];
        if (
          /(아파트|빌딩|빌라|타워|상가|센터|오피스텔|맨션|원룸)$/.test(lastWord)
        )
          return lastWord;
        if (words.length >= 2)
          return `${words[words.length - 2]} ${words[words.length - 1]}`
            .replace(/\(.*?\)/g, "")
            .trim();
        return address;
      };

      const getTagsHTML = (c: Customer) => {
        const serviceBadge = c.service_type
          ? `<span class="tag-badge service-tag">${c.service_type}</span>`
          : "";
        const modelBadge = c.model_name
          ? `<span class="tag-badge model-tag">${c.model_name}</span>`
          : "";
        if (!modelBadge && !serviceBadge) return "";
        return `<div class="tags-container">${serviceBadge}${modelBadge}</div>`;
      };

      const getShortServiceType = (type: string) => {
        if (!type) return "";
        if (type.includes("라이트 플러스")) return "라플";
        if (type.includes("라이트")) return "라";
        if (type.includes("기본")) return "기";
        return type.substring(0, 2);
      };

      // 💡 지도 마커에 띄울 2줄짜리 깔끔한 라벨! (배경 박스 삭제, 투명 태그 적용)
      const getLabelHTML = (c: Customer) => {
        const shortService = getShortServiceType(c.service_type || "");
        const modelName = c.model_name || ""; // 💡 모델명 원상 복구 (안 자름)

        let tags = "";
        if (shortService || modelName) {
          const sBadge = shortService
            ? `<span class="map-label-tag service">${shortService}</span>`
            : "";
          const mBadge = modelName
            ? `<span class="map-label-tag model">${modelName}</span>`
            : "";
          tags = `<div style="display:flex; gap:2px; margin-bottom:1px;">${sBadge}${mBadge}</div>`;
        }

        return `
          <div style="display:flex; flex-direction:column; align-items:center; pointer-events:none;">
            ${tags}
            <span class="marker-label">${c.name}</span>
          </div>
        `;
      };

      const generateSingleHTML = (customer: Customer, groupId: string) => {
        const phoneLink = customer.phone ? customer.phone : "";
        const isNoneChecked = customer.status === "미컨택" ? "checked" : "";
        const isContactChecked = customer.status === "컨택" ? "checked" : "";
        const isDoneChecked = customer.status === "완료" ? "checked" : "";
        const statusClass =
          customer.status === "완료"
            ? "done"
            : customer.status === "컨택"
              ? "contact"
              : "none";

        return `
          <div class="custom-popup single-popup" onwheel="event.stopPropagation()" ontouchmove="event.stopPropagation()" onmousedown="event.stopPropagation()">
            <button class="custom-popup-close" onclick="window.closeMapPopup('${groupId}')">✕</button>
            <div style="display:flex; align-items:center; gap:6px; margin-bottom:4px; padding-right:20px;">
              <span style="font-weight:900; font-size:14px; color:#0f172a; max-width:130px; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${customer.name}</span>
              <span id="badge_${customer.id}" class="group-status-badge ${statusClass}">${customer.status || "미컨택"}</span>
            </div>
            ${getTagsHTML(customer)}
            <div style="font-size:11px; color:#64748b; line-height:1.4; margin-bottom:12px; word-break:break-all; white-space:normal;">
              ${customer.address}
            </div>
            <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
              <div style="display:flex; gap:4px;">
                <a href="tel:${phoneLink}" class="circle-btn phone-btn" title="전화">📞</a>
                <button onclick="window.handleNaviMap('tmap', ${customer.longitude}, ${customer.latitude}, '${customer.name}')" class="circle-btn tmap-btn" title="티맵">T</button>
                <button onclick="window.handleNaviMap('nmap', ${customer.longitude}, ${customer.latitude}, '${customer.name}')" class="circle-btn nmap-btn" title="네이버">N</button>
              </div>
              <div class="map-status-selector" style="margin-top:0; flex:1;">
                <input type="radio" id="status_none_${customer.id}" name="status_${customer.id}" value="미컨택" ${isNoneChecked} onclick="window.changeMarkerStatus(${customer.id}, '미컨택', '${groupId}')">
                <label for="status_none_${customer.id}">미컨택</label>
                <input type="radio" id="status_contact_${customer.id}" name="status_${customer.id}" value="컨택" ${isContactChecked} onclick="window.changeMarkerStatus(${customer.id}, '컨택', '${groupId}')">
                <label for="status_contact_${customer.id}">컨택</label>
                <input type="radio" id="status_done_${customer.id}" name="status_${customer.id}" value="완료" ${isDoneChecked} onclick="window.changeMarkerStatus(${customer.id}, '완료', '${groupId}')">
                <label for="status_done_${customer.id}">완료</label>
              </div>
            </div>
          </div>
        `;
      };

      const generateGroupItemHTML = (customer: Customer, groupId: string) => {
        const phoneLink = customer.phone ? customer.phone : "";
        const isNoneChecked = customer.status === "미컨택" ? "checked" : "";
        const isContactChecked = customer.status === "컨택" ? "checked" : "";
        const isDoneChecked = customer.status === "완료" ? "checked" : "";
        const statusClass =
          customer.status === "완료"
            ? "done"
            : customer.status === "컨택"
              ? "contact"
              : "none";

        return `
          <div class="group-item">
            <div class="group-item-header" onclick="window.toggleGroupItem(${customer.id})">
              <div style="display:flex; flex-direction:column; gap:4px; max-width: 140px;">
                <span class="group-item-name">${customer.name}</span>
                ${getTagsHTML(customer)}
              </div>
              <div class="group-item-icons">
                <span id="badge_${customer.id}" class="group-status-badge ${statusClass}">${customer.status || "미컨택"}</span>
                <svg id="group_arrow_${customer.id}" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="transition: transform 0.2s;">
                  <polyline points="6 9 12 15 18 9"></polyline>
                </svg>
              </div>
            </div>
            
            <div id="group_body_${customer.id}" style="display:none; padding-top:4px; padding-bottom:12px;">
              <div style="font-size:11px; color:#64748b; line-height:1.4; margin-bottom:10px; word-break:break-all; white-space:normal;">
                ${customer.address}
              </div>
              <div style="display:flex; justify-content:space-between; align-items:center; gap:8px;">
                <div style="display:flex; gap:4px;">
                  <a href="tel:${phoneLink}" class="circle-btn phone-btn" title="전화">📞</a>
                  <button onclick="window.handleNaviMap('tmap', ${customer.longitude}, ${customer.latitude}, '${customer.name}')" class="circle-btn tmap-btn" title="티맵">T</button>
                  <button onclick="window.handleNaviMap('nmap', ${customer.longitude}, ${customer.latitude}, '${customer.name}')" class="circle-btn nmap-btn" title="네이버">N</button>
                </div>
                <div class="map-status-selector" style="margin-top:0; flex:1;">
                  <input type="radio" id="status_none_${customer.id}" name="status_${customer.id}" value="미컨택" ${isNoneChecked} onclick="window.changeMarkerStatus(${customer.id}, '미컨택', '${groupId}')">
                  <label for="status_none_${customer.id}">미컨택</label>
                  <input type="radio" id="status_contact_${customer.id}" name="status_${customer.id}" value="컨택" ${isContactChecked} onclick="window.changeMarkerStatus(${customer.id}, '컨택', '${groupId}')">
                  <label for="status_contact_${customer.id}">컨택</label>
                  <input type="radio" id="status_done_${customer.id}" name="status_${customer.id}" value="완료" ${isDoneChecked} onclick="window.changeMarkerStatus(${customer.id}, '완료', '${groupId}')">
                  <label for="status_done_${customer.id}">완료</label>
                </div>
              </div>
            </div>
          </div>
        `;
      };

      Object.values(grouped).forEach((group, index) => {
        const groupId = `group_${index}`;
        const markerPosition = new window.kakao.maps.LatLng(
          group[0].latitude,
          group[0].longitude,
        );
        bounds.extend(markerPosition);

        group.forEach((c) => (customerToGroupRef.current[c.id] = groupId));

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
          });
          markerOverlay.setMap(mapRef.current);

          const labelContent = getLabelHTML(customer);
          // 💡 마커와 글자 사이 간격을 다시 원상복구! (-0.2)
          const labelOverlay = new window.kakao.maps.CustomOverlay({
            position: markerPosition,
            content: labelContent,
            yAnchor: -0.2,
          });
          labelOverlay.setMap(mapRef.current);

          const popupOverlay = new window.kakao.maps.CustomOverlay({
            content: generateSingleHTML(customer, groupId),
            position: markerPosition,
            xAnchor: 0.5,
            yAnchor: 1.1,
            zIndex: 10,
            clickable: true,
          });

          markerMapRef.current[groupId] = {
            marker: markerOverlay,
            popup: popupOverlay,
            type: "single",
          };
          window.kakao.maps.event.addListener(markerOverlay, "click", () =>
            (window as any).openMapPopup(groupId),
          );
        } else {
          const baseSize = 28;
          const extraSize = (group.length - 2) * 5;
          const size = Math.min(baseSize + extraSize, 50);
          const fontSize = Math.min(12 + (group.length - 2), 16);

          const groupMarkerContent = `<div class="group-marker" style="width:${size}px; height:${size}px; font-size:${fontSize}px;" onclick="window.openMapPopup('${groupId}')">${group.length}</div>`;
          const markerOverlay = new window.kakao.maps.CustomOverlay({
            position: markerPosition,
            content: groupMarkerContent,
            yAnchor: 0.5,
            xAnchor: 0.5,
            clickable: true,
          });
          markerOverlay.setMap(mapRef.current);

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
            zIndex: 10,
            clickable: true,
          });

          markerMapRef.current[groupId] = {
            marker: markerOverlay,
            popup: popupOverlay,
            type: "group",
          };
        }
      });

      if (validCustomers.length > 0 && mapRef.current)
        mapRef.current.setBounds(bounds);
    });
  }, [mapLoaded, customers, isFullScreen]);

  const toggleLocationTracking = () => {
    if (!navigator.geolocation) {
      alert("현재 기기에서 위치 추적을 지원하지 않습니다.");
      return;
    }
    if (isTracking) {
      navigator.geolocation.clearWatch(watchIdRef.current!);
      if (myLocMarkerRef.current) myLocMarkerRef.current.setMap(null);
      setIsTracking(false);
    } else {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          const lat = position.coords.latitude;
          const lon = position.coords.longitude;
          const locPosition = new window.kakao.maps.LatLng(lat, lon);
          if (!myLocMarkerRef.current) {
            const content = `<div class="my-loc-dot"><div class="my-loc-pulse"></div></div>`;
            myLocMarkerRef.current = new window.kakao.maps.CustomOverlay({
              position: locPosition,
              content: content,
              xAnchor: 0.5,
              yAnchor: 0.5,
              zIndex: 30,
            });
          } else {
            myLocMarkerRef.current.setPosition(locPosition);
          }
          myLocMarkerRef.current.setMap(mapRef.current);
          mapRef.current.panTo(locPosition);
        },
        (error) => alert("위치를 가져올 수 없습니다. 권한을 확인해주세요."),
        { enableHighAccuracy: true },
      );
      setIsTracking(true);
    }
  };

  return (
    <>
      <style
        dangerouslySetInnerHTML={{
          __html: `
        .group-marker { background: #3b82f6; color: white; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-weight: 900; border: 2.5px solid white; box-shadow: 0 3px 6px rgba(0,0,0,0.2); cursor: pointer; transition: transform 0.1s; }
        .group-marker:active { transform: scale(0.9); }
        
        /* 💡 원래대로 복구된 라벨 스타일! */
        .marker-label { font-size: 12px; font-weight: 700; color: #21262e; text-shadow: -1px -1px 0 rgba(255,255,255,0.8), 1px -1px 0 rgba(255,255,255,0.8), -1px 1px 0 rgba(255,255,255,0.8), 1px 1px 0 rgba(255,255,255,0.8); white-space: nowrap; letter-spacing: -0.5px; }
        
        /* 💡 투명한듯 세련된 반투명 지도 태그 스타일 */
        .map-label-tag { font-size: 9px; font-weight: 800; padding: 1px 4px; border-radius: 4px; letter-spacing: -0.5px; background: rgba(255,255,255,0.65); backdrop-filter: blur(2px); }
        .map-label-tag.service { border: 1px solid rgba(37,99,235,0.4); color: #2563eb; }
        .map-label-tag.model { border: 1px solid rgba(71,85,105,0.4); color: #475569; }

        .custom-popup { background: white; border-radius: 12px; box-shadow: 0 6px 16px rgba(0,0,0,0.12); border: 1px solid #e2e8f0; font-family: sans-serif; box-sizing: border-box; width: 240px; position: relative; bottom: 12px; }
        .custom-popup::after { content: ''; position: absolute; bottom: -6px; left: 50%; transform: translateX(-50%); border-width: 6px 6px 0; border-style: solid; border-color: white transparent transparent transparent; }
        .single-popup { padding: 12px 14px; }
        .custom-popup-close { position: absolute; right: 8px; top: 8px; width: 20px; height: 20px; background: transparent; border: none; font-size: 13px; font-weight: bold; color: #94a3b8; cursor: pointer; display: flex; align-items: center; justify-content: center; transition: 0.2s; z-index: 20; }
        .custom-popup-close:hover { color: #334155; }

        .group-popup { overflow: hidden; display: flex; flex-direction: column; max-height: 220px; width: 240px; }
        .group-popup-header { background: #f8fafc; padding: 10px 14px; border-bottom: 1px solid #e2e8f0; display: flex; justify-content: space-between; align-items: center; position: sticky; top: 0; z-index: 10; font-weight: 800; font-size: 12px; color: #1e293b; }
        .group-popup-header button { background: none; border: none; font-size: 13px; font-weight: bold; color: #94a3b8; cursor: pointer; }
        
        .group-popup-list { padding: 0 14px; overflow-y: auto; display: flex; flex-direction: column; flex: 1; overscroll-behavior: contain; }
        .group-popup-list::-webkit-scrollbar { width: 4px; }
        .group-popup-list::-webkit-scrollbar-track { background: transparent; }
        .group-popup-list::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 4px; }
        
        .group-item { border-bottom: 1px dashed #cbd5e1; }
        .group-item:last-child { border-bottom: none; }
        .group-item-header { display: flex; justify-content: space-between; align-items: flex-start; padding: 10px 0; cursor: pointer; user-select: none; }
        .group-item-name { font-weight: 800; font-size: 13px; color: #1e293b; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; margin-bottom: 2px; }
        .group-item-icons { display: flex; align-items: center; gap: 6px; color: #94a3b8; margin-top: 2px; }
        
        .tags-container { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 4px; }
        .tag-badge { font-size: 9.5px; font-weight: 800; padding: 2px 5px; border-radius: 4px; letter-spacing: -0.3px; }
        .model-tag { background: #f1f5f9; color: #475569; border: 1px solid #e2e8f0; }
        .service-tag { background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; }

        .group-status-badge { font-size: 9px; padding: 3px 5px; border-radius: 4px; font-weight: bold; line-height: 1; }
        .group-status-badge.done { background: #dbeafe; color: #2563eb; }
        .group-status-badge.contact { background: #fef3c7; color: #d97706; }
        .group-status-badge.none { background: #fee2e2; color: #ef4444; }

        .circle-btn { width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 900; text-decoration: none; cursor: pointer; border: 1px solid transparent; padding: 0; box-shadow: 0 1px 2px rgba(0,0,0,0.05); }
        .phone-btn { background: #f8fafc; border-color: #e2e8f0; color: #475569; }
        .tmap-btn { background: #eff6ff; border-color: #bfdbfe; color: #2563eb; }
        .nmap-btn { background: #ecfdf5; border-color: #a7f3d0; color: #10b981; }
        
        .map-status-selector { display: flex; gap: 2px; background: #f1f5f9; padding: 2px; border-radius: 6px; margin-top: 4px; }
        .map-status-selector input[type="radio"] { display: none; }
        .map-status-selector label { flex: 1; text-align: center; font-size: 10px; font-weight: 700; padding: 4px 0; border-radius: 4px; cursor: pointer; color: #94a3b8; transition: all 0.2s ease; }
        .map-status-selector input[value="미컨택"]:checked + label { background: #ef4444; color: #fff; box-shadow: 0 1px 3px rgba(239,68,68,0.3); }
        .map-status-selector input[value="컨택"]:checked + label { background: #eab308; color: #fff; box-shadow: 0 1px 3px rgba(234,179,8,0.3); }
        .map-status-selector input[value="완료"]:checked + label { background: #3b82f6; color: #fff; box-shadow: 0 1px 3px rgba(59,130,246,0.3); }

        .my-loc-dot { width: 14px; height: 14px; background-color: #2563eb; border-radius: 50%; border: 2.5px solid white; box-shadow: 0 2px 4px rgba(0,0,0,0.3); position: relative; }
        .my-loc-pulse { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; border-radius: 50%; background-color: rgba(37, 99, 235, 0.4); animation: pulse-anim 1.5s infinite ease-out; pointer-events: none; }
        @keyframes pulse-anim { 0% { transform: scale(0.5); opacity: 1; } 100% { transform: scale(1.5); opacity: 0; } }
      `,
        }}
      />

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
