import { AuthRepository } from "../../domain/repositories/authRepository";
import { httpClient } from "../api/httpClient";

export class AuthApi implements AuthRepository {
  async loginWithKakao(code: string, redirectUri: string): Promise<{ token: string; nickname: string }> {
    const response = await httpClient.request("/api/auth/kakao", {
      method: "POST",
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
      }),
    });
    
    const data = await response.json();
    const token = data.access_token || data.accessToken;
    
    return {
      token,
      nickname: data.nickname || "",
    };
  }

  async updateNickname(nickname: string): Promise<{ success: boolean; nickname: string }> {
    const response = await httpClient.request("/api/users/nickname", {
      method: "PUT",
      body: JSON.stringify({ nickname }),
    });
    return response.json();
  }
}

export const authRepository = new AuthApi();
