export interface FailedCustomer {
  id: number;
  row: number;
  name: string;
  address: string;
  favorite?: boolean;
  absent?: boolean;
  visit_time?: string | null;
  memo?: string;
}

export interface UploadResponse {
  message: string;
  success_count: number;
  failed_count: number;
  failed_list: FailedCustomer[];
}

export interface Customer {
  id: number;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  phone?: string;
  status?: string;
  model_name?: string;
  service_type?: string;
  favorite?: boolean;
  absent?: boolean;
  visit_time?: string | null;
  memo?: string;
}

export interface UserProfile {
  nickname: string;
  email: string;
  level: string;
}

export interface AddressCorrectionCandidate {
  refined_address: string;
  confidence: string;
}

export interface AddressCorrection {
  customer_id: number;
  name: string;
  original_address: string;
  candidates: AddressCorrectionCandidate[];
}

/** 폰 캘린더에서 읽어 온 일정 한 건. start는 "YYYY-MM-DD HH:mm" 현지 시각. */
export interface CalendarEvent {
  title: string;
  start: string;
  event_id?: string;
}

/** 동기화 한 번의 결과 집계 (서버 응답, snake_case). */
export interface CalendarSyncResult {
  matched: number;
  updated: number;
  unchanged: number;
  review: number;
  cancelled: number;
  ignored: number;
}

export interface CalendarReviewCandidate {
  customer_id: number;
  address: string;
}

/** 사람이 골라야 하는 일정. reason이 MULTIPLE이면 candidates에 같은 이름의 집이 여러 개, NO_MATCH면 비어 있다. */
export interface CalendarReview {
  visit_id: number;
  customer_name: string;
  request_no: string;
  start_at: string;
  reason: "NO_MATCH" | "MULTIPLE" | string;
  candidates: CalendarReviewCandidate[];
}
