import { Command, type CommandHandler } from '../../../../shared/cqrs/command-bus';
import type { Principal } from '../../../../shared/security/principal';
import type { DecisionResult, VacationRequestDecider } from './decide-vacation-request';

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

export class ApproveVacationRequestHandler implements CommandHandler<ApproveVacationRequestCommand> {
  constructor(private readonly decider: VacationRequestDecider) {}

  handle({ actor, requestId, comment }: ApproveVacationRequestCommand): Promise<DecisionResult> {
    return this.decider.decide(actor, requestId, 'APPROVED', comment);
  }
}
