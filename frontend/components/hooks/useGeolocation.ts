import { useAlert } from "@/src/presentation/components/AlertContext";
import { useState, useRef, MutableRefObject } from "react";

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
  }
}

export const useGeolocation = (mapRef: MutableRefObject<any>) => {
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const myLocMarkerRef = useRef<any>(null);
  const hasPannedForTracking = useRef(false);
  const { showAlert } = useAlert();

  const toggleLocationTracking = () => {
    if (!navigator.geolocation) {
      showAlert({
        title: "위치 추적 불가",
        message: `현재 기기에서 위치 추적을 지원하지 않습니다.`,
        type: "error",
      });
      return;
    }
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "REQUEST_LOCATION_PERMISSION",
        }),
      );
    } else {
      // 만약 일반 PC 브라우저 접속이라면 가볍게 알림이나 브라우저 기본 geolocation 실행
    }
    if (isTracking) {
      navigator.geolocation.clearWatch(watchIdRef.current!);
      setIsTracking(false);
    } else {
      hasPannedForTracking.current = false;
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
            myLocMarkerRef.current.setMap(mapRef.current);
          } else {
            myLocMarkerRef.current.setPosition(locPosition);
            myLocMarkerRef.current.setMap(mapRef.current);
          }
          if (!hasPannedForTracking.current) {
            mapRef.current.panTo(locPosition);
            hasPannedForTracking.current = true;
          }
        },
        (error) => alert("위치를 가져올 수 없습니다. 권한을 확인해주세요."),
        { enableHighAccuracy: true },
      );
      setIsTracking(true);
    }
  };

  const clearTracking = () => {
    if (watchIdRef.current)
      navigator.geolocation.clearWatch(watchIdRef.current);
  };

  return { isTracking, toggleLocationTracking, clearTracking };
};
