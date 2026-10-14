import type { UserRole } from '@leaveflow/contracts';

/** The authenticated caller, derived exclusively from a verified access token. */
export interface Principal {
  userId: string;
  role: UserRole;
  name: string;
}

export interface TokenVerifier {
  /** Returns the principal for a valid token; throws UnauthenticatedError otherwise. */
  verify(token: string): Principal;
}
