export interface PasswordHasher {
  verify(password: string, hash: string): Promise<boolean>;
  /** Spends the same work as a real verification; used when the account does not exist. */
  verifyAgainstDummy(password: string): Promise<void>;
}
