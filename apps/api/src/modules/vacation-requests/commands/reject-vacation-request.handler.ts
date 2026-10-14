import type { CommandHandler } from '../../../shared/cqrs/command-bus';
import type { DecisionResult, VacationRequestDecider } from './vacation-request-decider';
import type { RejectVacationRequestCommand } from './reject-vacation-request.command';

export class RejectVacationRequestHandler implements CommandHandler<RejectVacationRequestCommand> {
  constructor(private readonly decider: VacationRequestDecider) {}

  handle({ actor, requestId, comment }: RejectVacationRequestCommand): Promise<DecisionResult> {
    return this.decider.decide(actor, requestId, 'REJECTED', comment);
  }
}
