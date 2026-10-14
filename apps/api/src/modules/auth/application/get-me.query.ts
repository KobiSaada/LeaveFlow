import type { PublicUser } from '@leaveflow/contracts';
import { type MessageHandler, Query } from '../../../shared/application/bus';
import { UnauthenticatedError } from '../../../shared/domain/errors';
import type { UserRepository } from '../../users/application/user-repository';

export class GetMeQuery extends Query<PublicUser> {
  static readonly type = 'GetMeQuery';
  readonly type = GetMeQuery.type;
  constructor(readonly userId: string) {
    super();
  }
}

export class GetMeHandler implements MessageHandler<GetMeQuery> {
  constructor(private readonly users: UserRepository) {}

  async handle({ userId }: GetMeQuery): Promise<PublicUser> {
    const user = await this.users.findById(userId);
    // A valid token for a user that no longer exists is not a session.
    if (!user) throw new UnauthenticatedError();
    return user;
  }
}
