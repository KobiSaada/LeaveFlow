import type { PublicUser, UserRole } from '@leaveflow/contracts';

export interface UserCredentials extends PublicUser {
  passwordHash: string;
}

export interface UserRepository {
  findById(id: string): Promise<PublicUser | null>;
  /** The only read that ever loads a password hash. */
  findCredentialsByEmail(email: string): Promise<UserCredentials | null>;
  list(filter: { role?: UserRole; limit: number }): Promise<PublicUser[]>;
}
