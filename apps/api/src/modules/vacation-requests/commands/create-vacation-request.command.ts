import type { IsoDate } from '@leaveflow/contracts';
import { Command } from '../../../shared/cqrs/command-bus';
import type { Principal } from '../../../shared/security/principal';

export interface CreateVacationRequestResult {
  id: string;
  /** False when an idempotent retry returned the request created by the original call. */
  created: boolean;
}

export class CreateVacationRequestCommand extends Command<CreateVacationRequestResult> {
  static readonly type = 'CreateVacationRequestCommand';
  readonly type = CreateVacationRequestCommand.type;
  constructor(
    readonly actor: Principal,
    readonly startDate: IsoDate,
    readonly endDate: IsoDate,
    readonly reason: string | null,
    readonly idempotencyKey: string | null,
  ) {
    super();
  }
}
