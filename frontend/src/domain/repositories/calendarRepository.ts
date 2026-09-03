import { CalendarEvent, CalendarReview, CalendarSyncResult } from "../entities/types";

export interface CalendarRepository {
  sync(events: CalendarEvent[], rangeStart: string, rangeEnd: string): Promise<CalendarSyncResult>;
  getReview(): Promise<CalendarReview[]>;
  resolveReview(visitId: number, customerId: number): Promise<boolean>;
  ignoreReview(visitId: number): Promise<boolean>;
}
