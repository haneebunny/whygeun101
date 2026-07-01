import { CustomerRepository } from "../../domain/repositories/customerRepository";
import { Customer, FailedCustomer, AddressCorrection } from "../../domain/entities/types";
import { httpClient } from "../api/httpClient";

export class CustomerApi implements CustomerRepository {
  async getCustomers(): Promise<{
    success_list: Customer[];
    failed_list: FailedCustomer[];
  }> {
    const response = await httpClient.request("/api/customers");
    const data = await response.json();
    return {
      success_list: data.success_list || [],
      failed_list: data.failed_list || [],
    };
  }

  async updateStatus(customerId: number, status: string): Promise<boolean> {
    const response = await httpClient.request(
      `/api/customers/${customerId}/status`,
      {
        method: "PUT",
        body: JSON.stringify({ status }),
      },
    );
    return response.ok;
  }

  async updateAddress(
    customerId: number,
    address: string,
  ): Promise<{ success: boolean; customer?: Customer }> {
    const response = await httpClient.request(`/api/customers/${customerId}`, {
      method: "PUT",
      body: JSON.stringify({ address }),
    });
    const data = await response.json();
    return {
      success: data.success,
      customer: data.customer,
    };
  }

  async deleteCustomer(customerId: number): Promise<boolean> {
    const response = await httpClient.request(`/api/customers/${customerId}`, {
      method: "DELETE",
    });
    return response.ok;
  }

  async clearAllCustomers(): Promise<boolean> {
    const response = await httpClient.request("/api/customers", {
      method: "DELETE",
    });
    return response.ok;
  }

  async uploadExcel(
    file: File,
  ): Promise<{ addedCount: number; deletedCount: number } | null> {
    const formData = new FormData();
    formData.append("file", file);

    const response = await httpClient.request("/api/customers/upload", {
      method: "POST",
      body: formData,
    });
    if (!response.ok) return null;
    const data = await response.json();
    const addedCount =
      typeof data.addedCount === "number"
        ? data.addedCount
        : typeof data.added_count === "number"
          ? data.added_count
          : 0;
    const deletedCount =
      typeof data.deletedCount === "number"
        ? data.deletedCount
        : typeof data.deleted_count === "number"
          ? data.deleted_count
          : 0;
    return { addedCount, deletedCount };
  }

  async toggleFavorite(
    customerId: number,
    favorite: boolean,
  ): Promise<boolean> {
    const response = await httpClient.request(
      `/api/customers/${customerId}/favorite`,
      {
        method: "PUT",
        body: JSON.stringify({ favorite }),
      },
    );
    return response.ok;
  }

  async updateVisitTime(
    customerId: number,
    visitTime: string | null,
  ): Promise<boolean> {
    const response = await httpClient.request(
      `/api/customers/${customerId}/visit-time`,
      {
        method: "PUT",
        body: JSON.stringify({ visit_time: visitTime }),
      },
    );
    return response.ok;
  }

  async addCustomer(
    name: string,
    address: string,
    phone: string,
    modelName: string,
    serviceType: string,
  ): Promise<boolean> {
    const response = await httpClient.request("/api/customers", {
      method: "POST",
      body: JSON.stringify({
        name,
        address,
        phone,
        model_name: modelName,
        service_type: serviceType,
      }),
    });
    return response.ok;
  }

  async updateMemo(customerId: number, memo: string): Promise<boolean> {
    const response = await httpClient.request(
      `/api/customers/${customerId}/memo`,
      {
        method: "PUT",
        body: JSON.stringify({ memo }),
      },
    );
    return response.ok;
  }

  async getAddressCorrections(): Promise<AddressCorrection[]> {
    const response = await httpClient.request("/api/customers/corrections");
    if (!response.ok) return [];
    return await response.json();
  }

  async getCorrectionCandidates(customerId: number): Promise<AddressCorrection> {
    const response = await httpClient.request(`/api/customers/${customerId}/correction-candidates`);
    if (!response.ok) {
      throw new Error(`Failed to fetch correction candidates for customer ${customerId}`);
    }
    return await response.json();
  }

  async applyCorrectionsBulk(): Promise<{ updatedCount: number } | null> {
    const response = await httpClient.request("/api/customers/apply-corrections-bulk", {
      method: "POST",
    });
    if (!response.ok) return null;
    return await response.json();
  }
}

export const customerRepository = new CustomerApi();
