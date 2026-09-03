import { CalendarRepository } from "../../domain/repositories/calendarRepository";
import { CalendarEvent, CalendarReview, CalendarSyncResult } from "../../domain/entities/types";
import { httpClient } from "../api/httpClient";

/** 폰 캘린더 일정 동기화 API. 서버는 { success, data } 형태로 답한다. */
export class CalendarApi implements CalendarRepository {
  async sync(events: CalendarEvent[], rangeStart: string, rangeEnd: string): Promise<CalendarSyncResult> {
    const response = await httpClient.request("/api/calendar/sync", {
      method: "POST",
      body: JSON.stringify({
        range_start: rangeStart,
        range_end: rangeEnd,
        events: events.map((e) => ({ title: e.title, start: e.start, event_id: e.event_id ?? null })),
      }),
    });
    const data = await response.json();
    return data.data as CalendarSyncResult;
  }

  async getReview(): Promise<CalendarReview[]> {
    const response = await httpClient.request("/api/calendar/review");
    const data = await response.json();
    return (data.data || []) as CalendarReview[];
  }

  async resolveReview(visitId: number, customerId: number): Promise<boolean> {
    const response = await httpClient.request(`/api/calendar/review/${visitId}/resolve`, {
      method: "POST",
      body: JSON.stringify({ customer_id: customerId }),
    });
    return response.ok;
  }

  async ignoreReview(visitId: number): Promise<boolean> {
    const response = await httpClient.request(`/api/calendar/review/${visitId}/ignore`, {
      method: "POST",
    });
    return response.ok;
  }
}

export const calendarRepository = new CalendarApi();
