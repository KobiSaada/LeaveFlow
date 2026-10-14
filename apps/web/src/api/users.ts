import type { ItemList, PublicUser, UserRole } from '@leaveflow/contracts';
import { http } from './http';

export const usersApi = {
  async list(role?: UserRole): Promise<PublicUser[]> {
    return (await http.get<ItemList<PublicUser>>('/users', { params: { role } })).data.items;
  },
};
