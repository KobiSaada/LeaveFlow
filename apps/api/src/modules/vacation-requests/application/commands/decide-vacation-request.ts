import type { Clock } from '../../../../shared/time/clock';
import type { Principal } from '../../../../shared/security/principal';
import type { UnitOfWork } from '../../../../shared/cqrs/unit-of-work';
import { ForbiddenError } from '../../../../shared/errors/application-errors';
import type { UserRepository } from '../../../users/application/user-repository';
import type { Decision } from '../../domain/vacation-request';
import {
  RequestNotPendingError,
  VacationRequestNotFoundError,
} from '../../domain/vacation-request.errors';
import type { VacationRequestRepository } from '../ports/vacation-request-repository';

export interface DecisionResult {
  id: string;
  /** False when the request already carried this decision (idempotent retry, no event emitted). */
  changed: boolean;
}

/**
 * Shared by ApproveVacationRequestHandler and RejectVacationRequestHandler. The aggregate decides
 * whether the transition is legal; the repository persists it with compare-and-set so that, when
 * two validators race, exactly one decision is stored and exactly one event is emitted.
 */
export class VacationRequestDecider {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly requests: VacationRequestRepository,
    private readonly users: UserRepository,
    private readonly clock: Clock,
  ) {}

  async decide(
    actor: Principal,
    requestId: string,
    decision: Decision,
    comment: string | null,
  ): Promise<DecisionResult> {
    // BR-6: only validators decide.
    if (actor.role !== 'VALIDATOR') throw new ForbiddenError();
    try {
      return await this.unitOfWork.run(async (tx) => {
        const request = await this.requests.findById(tx, requestId);
        if (!request) throw new VacationRequestNotFoundError();

        const outcome = request.decide(decision, actor.userId, comment, this.clock.now());
        if (outcome === 'unchanged') return { id: requestId, changed: false };

        if (!(await this.requests.saveDecision(tx, request))) {
          // Lost the race. Under READ COMMITTED this fresh read sees the winner's committed row.
          const current = await this.requests.findById(tx, requestId);
          if (current?.status === decision) return { id: requestId, changed: false };
          throw new RequestNotPendingError(current?.status ?? 'PENDING', null);
        }
        tx.recordEvents(request.pullEvents());
        return { id: requestId, changed: true };
      });
    } catch (error) {
      throw error instanceof RequestNotPendingError
        ? await this.withDecider(requestId, error)
        : error;
    }
  }

  /** Adds who made the existing decision, so the client can say "already rejected by Yossi". */
  private async withDecider(
    requestId: string,
    error: RequestNotPendingError,
  ): Promise<RequestNotPendingError> {
    const current = await this.unitOfWork.run((tx) => this.requests.findById(tx, requestId));
    if (!current?.decidedBy) return error;
    const decider = await this.users.findById(current.decidedBy);
    return new RequestNotPendingError(
      current.status,
      decider ? { id: decider.id, name: decider.name } : null,
    );
  }
}
