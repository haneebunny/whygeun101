import { useAlert } from "@/src/presentation/components/AlertContext";
import { useState, useRef, MutableRefObject, useEffect } from "react";

declare global {
  interface Window {
    ReactNativeWebView?: {
      postMessage: (message: string) => void;
    };
    kakao: any;
  }
}

export const useGeolocation = (mapRef: MutableRefObject<any>) => {
  const [isTracking, setIsTracking] = useState(false);
  const watchIdRef = useRef<number | null>(null);
  const myLocMarkerRef = useRef<any>(null);
  const hasPannedForTracking = useRef(false);
  const { showAlert } = useAlert();

  const updateLocation = (lat: number, lon: number) => {
    if (!window.kakao || !window.kakao.maps) return;
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
  };

  useEffect(() => {
    const handleNativeGps = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (detail && detail.latitude && detail.longitude) {
        updateLocation(detail.latitude, detail.longitude);
      }
    };

    window.addEventListener("nativeGps", handleNativeGps);
    return () => {
      window.removeEventListener("nativeGps", handleNativeGps);
    };
  }, [mapRef]);

  const toggleLocationTracking = () => {
    if (window.ReactNativeWebView) {
      hasPannedForTracking.current = false;
      setIsTracking(true);
      window.ReactNativeWebView.postMessage(
        JSON.stringify({
          type: "REQUEST_LOCATION_PERMISSION",
        }),
      );
      return;
    }

    if (!navigator.geolocation) {
      showAlert({
        title: "위치 추적 불가",
        message: `현재 기기에서 위치 추적을 지원하지 않습니다.`,
        type: "error",
      });
      return;
    }

    if (isTracking) {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
        watchIdRef.current = null;
      }
      setIsTracking(false);
    } else {
      hasPannedForTracking.current = false;
      watchIdRef.current = navigator.geolocation.watchPosition(
        (position) => {
          updateLocation(position.coords.latitude, position.coords.longitude);
        },
        (error) => alert("위치를 가져올 수 없습니다. 권한을 확인해주세요."),
        { enableHighAccuracy: true },
      );
      setIsTracking(true);
    }
  };

  const clearTracking = () => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
  };

  return { isTracking, toggleLocationTracking, clearTracking };
};
