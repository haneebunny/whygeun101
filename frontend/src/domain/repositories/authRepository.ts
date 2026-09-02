export interface AuthRepository {
  loginWithKakao(code: string, redirectUri: string): Promise<{ token: string; nickname: string }>;
  updateNickname(nickname: string): Promise<{ success: boolean; nickname: string }>;
  deleteAccount(): Promise<{ success: boolean }>;
}
