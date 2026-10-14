import { Command, type CommandHandler } from '../../../../shared/cqrs/command-bus';
import type { Principal } from '../../../../shared/security/principal';
import type { DecisionResult, VacationRequestDecider } from './decide-vacation-request';

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

export class RejectVacationRequestHandler implements CommandHandler<RejectVacationRequestCommand> {
  constructor(private readonly decider: VacationRequestDecider) {}

  handle({ actor, requestId, comment }: RejectVacationRequestCommand): Promise<DecisionResult> {
    return this.decider.decide(actor, requestId, 'REJECTED', comment);
  }
}
