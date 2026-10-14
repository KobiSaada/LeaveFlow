import type { LoginRequest, LoginResponse, PublicUser } from '@leaveflow/contracts';
import { http } from '@/shared/api/http';

export const authApi = {
  async login(body: LoginRequest): Promise<LoginResponse> {
    return (await http.post<LoginResponse>('/auth/login', body)).data;
  },
  async me(): Promise<PublicUser> {
    return (await http.get<PublicUser>('/auth/me')).data;
  },
};
