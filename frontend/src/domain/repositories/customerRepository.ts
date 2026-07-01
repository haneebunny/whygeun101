import { Customer, FailedCustomer, AddressCorrection } from "../entities/types";

export interface CustomerRepository {
  getCustomers(): Promise<{ success_list: Customer[]; failed_list: FailedCustomer[] }>;
  updateStatus(customerId: number, status: string): Promise<boolean>;
  updateAddress(customerId: number, address: string): Promise<{ success: boolean; customer?: Customer }>;
  deleteCustomer(customerId: number): Promise<boolean>;
  clearAllCustomers(): Promise<boolean>;
  uploadExcel(file: File): Promise<{ addedCount: number; deletedCount: number } | null>;
  toggleFavorite(customerId: number, favorite: boolean): Promise<boolean>;
  updateVisitTime(customerId: number, visitTime: string | null): Promise<boolean>;
  addCustomer(name: string, address: string, phone: string, modelName: string, serviceType: string): Promise<boolean>;
  updateMemo(customerId: number, memo: string): Promise<boolean>;
  getAddressCorrections(): Promise<AddressCorrection[]>;
  getCorrectionCandidates(customerId: number): Promise<AddressCorrection>;
  applyCorrectionsBulk(): Promise<{ updatedCount: number } | null>;
}
