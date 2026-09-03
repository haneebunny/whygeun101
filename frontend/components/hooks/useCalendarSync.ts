"use client";

import { useEffect, useRef, useState } from "react";
import { useAlert } from "@/src/presentation/components/AlertContext";
import { calendarRepository } from "@/src/data/repositories/calendarApi";
import { CalendarEvent, CalendarSyncResult } from "@/src/domain/entities/types";
import { trackEvent } from "@/src/presentation/utils/mixpanel";

/**
 * 폰 캘린더의 "○○○ 고객님 방문요청(번호)" 일정을 방문 시각으로 가져오는 흐름.
 *
 * 웹 → 앱 껍데기: REQUEST_CALENDAR_EVENTS (며칠치 읽을지)
 * 앱 껍데기 → 웹: NATIVE_CALENDAR_EVENTS { events, range_start, range_end }, NATIVE_CALENDAR_DENIED, NATIVE_CALENDAR_ERROR
 *   (app/page.tsx의 수신부가 window 이벤트 nativeCalendarEvents / nativeCalendarDenied / nativeCalendarError 로 바꿔 준다)
 * 웹 → 서버: /api/calendar/sync
 *
 * 브라우저에서는 캘린더를 읽을 수 없어 앱에서만 동작한다.
 */

export const CALENDAR_SYNC_ENABLED_KEY = "calendarSyncEnabled";
/** 앞으로 며칠치를 읽을지. 회사 시스템이 보통 2주 안쪽으로 일정을 잡는다. */
export const CALENDAR_SYNC_DAYS = 14;
/** 앱이 답이 없을 때(캘린더 기능이 없는 옛 버전 등) 기다리는 시간. */
const NATIVE_RESPONSE_TIMEOUT_MS = 10_000;

export interface NativeCalendarPayload {
  events: CalendarEvent[];
  range_start: string;
  range_end: string;
}

export function isNativeApp(): boolean {
  return typeof window !== "undefined" && !!window.ReactNativeWebView;
}

export function isCalendarSyncEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(CALENDAR_SYNC_ENABLED_KEY) === "1";
}

export function setCalendarSyncEnabled(enabled: boolean) {
  localStorage.setItem(CALENDAR_SYNC_ENABLED_KEY, enabled ? "1" : "0");
}

export function summarizeSyncResult(r: CalendarSyncResult): string {
  const lines: string[] = [];
  if (r.matched > 0) lines.push(`새로 등록 ${r.matched}건`);
  if (r.updated > 0) lines.push(`시각 변경 ${r.updated}건`);
  if (r.cancelled > 0) lines.push(`취소 ${r.cancelled}건`);
  if (r.review > 0) lines.push(`확인 필요 ${r.review}건 (설정 > 캘린더 연동에서 확인)`);
  if (lines.length === 0) return "새로 가져올 일정이 없습니다.";
  return lines.join("\n");
}

export const useCalendarSync = (onSynced?: (result: CalendarSyncResult) => void) => {
  const { showAlert } = useAlert();
  const [isSyncing, setIsSyncing] = useState(false);
  const [lastResult, setLastResult] = useState<CalendarSyncResult | null>(null);
  const manualRef = useRef(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onSyncedRef = useRef(onSynced);
  useEffect(() => {
    onSyncedRef.current = onSynced;
  }, [onSynced]);

  const clearTimer = () => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  };

  useEffect(() => {
    const handleEvents = async (e: Event) => {
      clearTimer();
      const payload = (e as CustomEvent<NativeCalendarPayload>).detail;
      if (!payload || !Array.isArray(payload.events)) {
        setIsSyncing(false);
        return;
      }
      try {
        const result = await calendarRepository.sync(payload.events, payload.range_start, payload.range_end);
        setLastResult(result);
        trackEvent("Calendar Sync", {
          manual: manualRef.current,
          events: payload.events.length,
          matched: result.matched,
          updated: result.updated,
          review: result.review,
          cancelled: result.cancelled,
        });
        onSyncedRef.current?.(result);
        const changed = result.matched + result.updated + result.cancelled + result.review;
        if (manualRef.current || changed > 0) {
          showAlert({
            title: "캘린더 일정 가져오기",
            message: summarizeSyncResult(result),
            type: result.review > 0 ? "warning" : "success",
          });
        }
      } catch (err: unknown) {
        console.error("Calendar sync failed", err);
        showAlert({
          title: "일정 가져오기 실패",
          message: "캘린더 일정을 서버에 반영하지 못했습니다. 잠시 후 다시 시도해 주세요.",
          type: "error",
          debugInfo: err instanceof Error ? err.stack : String(err),
        });
      } finally {
        setIsSyncing(false);
        manualRef.current = false;
      }
    };

    const handleDenied = () => {
      clearTimer();
      setIsSyncing(false);
      manualRef.current = false;
      showAlert({
        title: "캘린더 권한 없음",
        message: "휴대폰 설정에서 모두의 외근 앱의 캘린더 권한을 허용해 주세요.",
        type: "warning",
      });
    };

    const handleError = (e: Event) => {
      clearTimer();
      setIsSyncing(false);
      manualRef.current = false;
      const detail = (e as CustomEvent<{ message?: string }>).detail;
      showAlert({
        title: "캘린더를 읽지 못했습니다",
        message: "휴대폰 캘린더를 읽는 중 문제가 생겼습니다. 잠시 후 다시 시도해 주세요.",
        type: "error",
        debugInfo: detail?.message,
      });
    };

    window.addEventListener("nativeCalendarEvents", handleEvents);
    window.addEventListener("nativeCalendarDenied", handleDenied);
    window.addEventListener("nativeCalendarError", handleError);
    return () => {
      clearTimer();
      window.removeEventListener("nativeCalendarEvents", handleEvents);
      window.removeEventListener("nativeCalendarDenied", handleDenied);
      window.removeEventListener("nativeCalendarError", handleError);
    };
    // showAlert는 컨텍스트에서 오는 안정된 함수다.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** manual=true면 결과가 없어도 알림을 띄운다. 자동 동기화는 바뀐 게 있을 때만 알린다. */
  const sync = (manual = false) => {
    if (!isNativeApp()) {
      if (manual) {
        showAlert({
          title: "앱에서만 가능",
          message: "휴대폰 캘린더는 모두의 외근 앱에서만 읽을 수 있습니다.",
          type: "info",
        });
      }
      return;
    }
    if (isSyncing) return;
    manualRef.current = manual;
    setIsSyncing(true);
    window.ReactNativeWebView!.postMessage(
      JSON.stringify({ type: "REQUEST_CALENDAR_EVENTS", payload: { days: CALENDAR_SYNC_DAYS } }),
    );
    clearTimer();
    timeoutRef.current = setTimeout(() => {
      setIsSyncing(false);
      if (manualRef.current) {
        showAlert({
          title: "앱 업데이트 필요",
          message: "이 앱 버전은 캘린더 읽기를 지원하지 않습니다. 플레이스토어에서 앱을 업데이트해 주세요.",
          type: "warning",
        });
      }
      manualRef.current = false;
    }, NATIVE_RESPONSE_TIMEOUT_MS);
  };

  return { sync, isSyncing, lastResult };
};
