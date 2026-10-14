import { randomUUID } from 'node:crypto';
import type { IsoDate } from '@leaveflow/contracts';
import { Command, type CommandHandler } from '../../../../shared/cqrs/command-bus';
import type { Clock } from '../../../../shared/time/clock';
import type { Principal } from '../../../../shared/security/principal';
import type { Transaction, UnitOfWork } from '../../../../shared/cqrs/unit-of-work';
import { ForbiddenError } from '../../../../shared/errors/application-errors';
import { DateRange } from '../../domain/date-range';
import { VacationRequest } from '../../domain/vacation-request';
import {
  IdempotencyKeyReusedError,
  VacationOverlapError,
} from '../../domain/vacation-request.errors';
import type { VacationRequestRepository } from '../ports/vacation-request-repository';

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

export class CreateVacationRequestHandler implements CommandHandler<CreateVacationRequestCommand> {
  constructor(
    private readonly unitOfWork: UnitOfWork,
    private readonly requests: VacationRequestRepository,
    private readonly clock: Clock,
  ) {}

  async handle(command: CreateVacationRequestCommand): Promise<CreateVacationRequestResult> {
    // BR-6 / D-3: only requesters submit (also enforced at the HTTP edge; defence in depth).
    if (command.actor.role !== 'REQUESTER') throw new ForbiddenError();
    return this.unitOfWork.run((tx) => this.create(tx, command));
  }

  private async create(
    tx: Transaction,
    command: CreateVacationRequestCommand,
  ): Promise<CreateVacationRequestResult> {
    // One writer per user schedule: every read below sees all previously committed requests.
    await this.requests.lockScheduleOf(tx, command.actor.userId);
    const replay = await this.replay(tx, command);
    if (replay) return replay;

    const range = DateRange.of(command.startDate, command.endDate); // BR-1
    const request = VacationRequest.submit({
      id: randomUUID(),
      requesterId: command.actor.userId,
      range,
      reason: command.reason,
      idempotencyKey: command.idempotencyKey,
      today: this.clock.today(), // BR-4, evaluated in the business time zone
      now: this.clock.now(),
    });

    // BR-2 pre-check for a helpful message; the exclusion constraint is the real guarantee.
    const conflict = await this.requests.findActiveOverlapping(tx, command.actor.userId, range);
    if (conflict) {
      throw new VacationOverlapError({
        id: conflict.id,
        startDate: conflict.range.start,
        endDate: conflict.range.end,
      });
    }

    await this.requests.insert(tx, request);
    tx.recordEvents(request.pullEvents());
    return { id: request.id, created: true };
  }

  /** Same key + same payload → the original request; same key + different payload → 409. */
  private async replay(
    tx: Transaction,
    command: CreateVacationRequestCommand,
  ): Promise<CreateVacationRequestResult | null> {
    if (!command.idempotencyKey) return null;
    const existing = await this.requests.findByIdempotencyKey(
      tx,
      command.actor.userId,
      command.idempotencyKey,
    );
    if (!existing) return null;
    const requested = DateRange.fromTrusted(command.startDate, command.endDate);
    if (!existing.hasSamePayload(requested, command.reason)) throw new IdempotencyKeyReusedError();
    return { id: existing.id, created: false };
  }
}
