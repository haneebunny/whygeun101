export interface FailedCustomer {
  id: number;
  row: number;
  name: string;
  address: string;
  favorite?: boolean;
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
