import { describe, expect, it, vi } from 'vitest';
import { UnauthenticatedError } from '../../../shared/domain/errors';
import type { UserCredentials, UserRepository } from '../../users/application/user-repository';
import { AuthService, InvalidCredentialsError } from './auth.service';
import type { PasswordHasher } from './password-hasher';

const alice: UserCredentials = {
  id: '8c1d6661-f2f8-45be-9424-7a9ddaafb0a3',
  name: 'Alice Cohen',
  email: 'alice@leaveflow.dev',
  role: 'REQUESTER',
  passwordHash: '$2b$10$hash',
};

function setup(user: UserCredentials | null, passwordMatches: boolean) {
  const users: UserRepository = {
    findById: vi.fn(),
    list: vi.fn(),
    findCredentialsByEmail: vi.fn().mockResolvedValue(user),
  };
  const hasher: PasswordHasher = {
    verify: vi.fn().mockResolvedValue(passwordMatches),
    verifyAgainstDummy: vi.fn().mockResolvedValue(undefined),
  };
  const tokens = { issue: vi.fn().mockReturnValue({ accessToken: 'token', expiresIn: 60 }) };
  return { service: new AuthService(users, hasher, tokens), hasher, tokens, users };
}

describe('AuthService.login', () => {
  it('issues a token and returns the public profile without the hash', async () => {
    const { service, tokens } = setup(alice, true);
    const result = await service.login(alice.email, 'pw');
    expect(result).toEqual({
      accessToken: 'token',
      tokenType: 'Bearer',
      expiresIn: 60,
      user: { id: alice.id, name: alice.name, email: alice.email, role: 'REQUESTER' },
    });
    expect(JSON.stringify(result)).not.toContain('passwordHash');
    expect(tokens.issue).toHaveBeenCalledWith({
      userId: alice.id,
      role: 'REQUESTER',
      name: 'Alice Cohen',
    });
  });

  it('rejects a wrong password without issuing a token', async () => {
    const { service, tokens } = setup(alice, false);
    await expect(service.login(alice.email, 'bad')).rejects.toBeInstanceOf(InvalidCredentialsError);
    expect(tokens.issue).not.toHaveBeenCalled();
  });

  it('spends a dummy hash comparison for unknown emails and fails identically', async () => {
    const { service, hasher } = setup(null, false);
    await expect(service.login('ghost@leaveflow.dev', 'x')).rejects.toBeInstanceOf(
      InvalidCredentialsError,
    );
    expect(hasher.verifyAgainstDummy).toHaveBeenCalledWith('x');
    expect(hasher.verify).not.toHaveBeenCalled();
  });
});

describe('AuthService.me', () => {
  it('returns the public profile of the token subject', async () => {
    const { service, users } = setup(alice, true);
    const { passwordHash: _omit, ...profile } = alice;
    vi.mocked(users.findById).mockResolvedValue(profile);
    await expect(service.me(alice.id)).resolves.toEqual(profile);
  });

  it('treats a token for a user that no longer exists as unauthenticated', async () => {
    const { service, users } = setup(alice, true);
    vi.mocked(users.findById).mockResolvedValue(null);
    await expect(service.me(alice.id)).rejects.toBeInstanceOf(UnauthenticatedError);
  });
});
