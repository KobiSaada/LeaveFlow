import { Command } from '../../../shared/cqrs/command-bus';
import type { Principal } from '../../../shared/security/principal';
import type { DecisionResult } from './vacation-request-decider';

export class ApproveVacationRequestCommand extends Command<DecisionResult> {
  static readonly type = 'ApproveVacationRequestCommand';
  readonly type = ApproveVacationRequestCommand.type;
  constructor(
    readonly actor: Principal,
    readonly requestId: string,
    readonly comment: string | null,
  ) {
    super();
  }
}
