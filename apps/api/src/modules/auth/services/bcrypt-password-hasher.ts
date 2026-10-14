import { randomUUID } from 'node:crypto';
import bcrypt from 'bcryptjs';
import type { PasswordHasher } from './password-hasher';

const BCRYPT_COST = 10;

export class BcryptPasswordHasher implements PasswordHasher {
  private dummyHash: Promise<string> | undefined;

  verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  async verifyAgainstDummy(password: string): Promise<void> {
    this.dummyHash ??= bcrypt.hash(randomUUID(), BCRYPT_COST);
    await bcrypt.compare(password, await this.dummyHash);
  }
}
