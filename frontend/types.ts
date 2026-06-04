export interface FailedCustomer {
  id: number; // 💡 수동 수정을 위해 ID 바인딩 추가
  row: number;
  name: string;
  address: string;
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
}
