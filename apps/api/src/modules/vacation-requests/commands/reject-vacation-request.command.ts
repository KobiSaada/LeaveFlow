import { Command } from '../../../shared/cqrs/command-bus';
import type { Principal } from '../../../shared/security/principal';
import type { DecisionResult } from './vacation-request-decider';

export class RejectVacationRequestCommand extends Command<DecisionResult> {
  static readonly type = 'RejectVacationRequestCommand';
  readonly type = RejectVacationRequestCommand.type;
  constructor(
    readonly actor: Principal,
    readonly requestId: string,
    /** Required (BR-5); a blank value is refused by the aggregate with REJECTION_COMMENT_REQUIRED. */
    readonly comment: string | null,
  ) {
    super();
  }
}
