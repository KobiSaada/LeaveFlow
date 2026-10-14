import type { CommandHandler } from '../../../shared/cqrs/command-bus';
import type { DecisionResult, VacationRequestDecider } from './vacation-request-decider';
import type { ApproveVacationRequestCommand } from './approve-vacation-request.command';

export class ApproveVacationRequestHandler implements CommandHandler<ApproveVacationRequestCommand> {
  constructor(private readonly decider: VacationRequestDecider) {}

  handle({ actor, requestId, comment }: ApproveVacationRequestCommand): Promise<DecisionResult> {
    return this.decider.decide(actor, requestId, 'APPROVED', comment);
  }
}
