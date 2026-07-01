"use client";

import { useEffect, useState } from "react";

export default function AppBridgeTest() {
  const [log, setLog] = useState<string>("대기 중...");
  const [location, setLocation] = useState<{
    latitude: number;
    longitude: number;
  } | null>(null);

  // 1. 앱(Expo)이 보내주는 GPS 좌표 신호 수신 대기 (window.addEventListener)
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      try {
        const data = JSON.parse(event.data);
        setLog(`앱으로부터 신호 수신: ${data.type}`);

        // 앱이 보낸 GPS 데이터가 맞다면 상태에 저장
        if (data.type === "NATIVE_GPS_RESPONSE") {
          setLocation({
            latitude: data.payload.latitude,
            longitude: data.payload.longitude,
          });
          setLog("✅ GPS 좌표 수신 성공!");
        }
      } catch (error) {
        setLog(
          `데이터 파싱 에러:{error instanceof Error ? error.message : String(error)}`,
        );
      }
    };

    // 안드로이드/iOS 웹뷰 브릿지 이벤트 등록
    window.addEventListener("message", handleMessage);
    document.addEventListener("message", handleMessage); // 안드로이드 하위버전 대응

    return () => {
      window.removeEventListener("message", handleMessage);
      document.removeEventListener("message", handleMessage);
    };
  }, []);

  // 2. 버튼 누르면 앱(Expo)에게 "GPS 권한이랑 좌표 줘"라고 요청하는 함수
  const requestGPS = () => {
    if (window.ReactNativeWebView) {
      setLog("앱에게 위치 권한 및 좌표 요청 중...");

      // 하니가 App.tsx에 적어둔 switch-case문과 정확히 Type명을 일치시켜야 해!
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "REQUEST_LOCATION_PERMISSION" }),
      );
    } else {
      setLog(
        "❌ 현재 일반 웹 브라우저 환경입니다. 앱(Expo Go) 안에서 테스트해 주세요.",
      );
    }
  };

  // 3. 버튼 누르면 폰에 진동 울리게 하기 테스트
  const triggerHaptic = () => {
    if (window.ReactNativeWebView) {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: "TRIGGER_HAPTIC" }),
      );
    }
  };

  return (
    <div
      style={{
        padding: "24px",
        background: "#0F172A",
        color: "#fff",
        minHeight: "100vh",
      }}
    >
      <h1 style={{ fontSize: "20px", fontWeight: "bold" }}>
        💼 모두의 외근 브릿지 테스트 연동 관제탑
      </h1>

      <div
        style={{
          background: "#1E293B",
          padding: "16px",
          borderRadius: "8px",
          margin: "16px 0",
        }}
      >
        <p>
          <strong>상태 로그:</strong> {log}
        </p>
        {location && (
          <p style={{ color: "#10B981" }}>
            <strong>현재 위도:</strong> {location.latitude} <br />
            <strong>현재 경도:</strong> {location.longitude}
          </p>
        )}
      </div>

      <button
        onClick={requestGPS}
        style={{
          padding: "12px 24px",
          background: "#2563EB",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          marginRight: "8px",
          cursor: "pointer",
        }}
      >
        🛰️ 실시간 내 GPS 좌표 땡겨오기
      </button>

      <button
        onClick={triggerHaptic}
        style={{
          padding: "12px 24px",
          background: "#EF4444",
          color: "#fff",
          border: "none",
          borderRadius: "6px",
          cursor: "pointer",
        }}
      >
        📳 폰 진동(Haptic) 울리기
      </button>
    </div>
  );
}
