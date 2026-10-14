import {
  approveVacationRequestSchema,
  createVacationRequestSchema,
  idempotencyKeySchema,
  listMyVacationRequestsQuerySchema,
  listVacationRequestsQuerySchema,
  rejectVacationRequestSchema,
  teamCalendarQuerySchema,
  uuidSchema,
} from '@leaveflow/contracts';
import { z } from 'zod';
import { endpoint, HttpResponse } from '../../../shared/http/endpoint';
import { type EndpointRequest, validate } from '../../../shared/http/request';
import { ApproveVacationRequestCommand } from '../application/commands/approve-vacation-request.command';
import { CreateVacationRequestCommand } from '../application/commands/create-vacation-request.command';
import { RejectVacationRequestCommand } from '../application/commands/reject-vacation-request.command';

const pathId = (request: EndpointRequest): string =>
  validate(z.object({ id: uuidSchema }), { id: request.pathParam('id') }, 'path').id;

/** POST /vacation-requests — 201 on creation, 200 when an Idempotency-Key replays an earlier call. */
const createVacationRequest = endpoint({
  access: ['REQUESTER'],
  parse: (request) => {
    const header = request.header('idempotency-key');
    return {
      body: validate(createVacationRequestSchema, request.body(), 'body'),
      idempotencyKey:
        header === undefined ? null : validate(idempotencyKeySchema, header, 'header'),
    };
  },
  handle: async ({ body, idempotencyKey }, { principal, container }) => {
    const { id, created } = await container.commandBus.dispatch(
      new CreateVacationRequestCommand(
        principal,
        body.startDate,
        body.endDate,
        body.reason,
        idempotencyKey,
      ),
    );
    const dto = await container.services.vacationRequests.getById(principal, id);
    return created ? HttpResponse.created(dto) : HttpResponse.ok(dto);
  },
});

/** GET /me/vacation-requests — the caller's own requests, newest first. */
const listMyVacationRequests = endpoint({
  access: ['REQUESTER'],
  parse: (request) => validate(listMyVacationRequestsQuerySchema, request.query(), 'query'),
  handle: async (filter, { principal, container }) =>
    HttpResponse.ok(await container.services.vacationRequests.listMine(principal, filter)),
});

/** GET /vacation-requests — all requests, filterable by status and user. */
const listVacationRequests = endpoint({
  access: ['VALIDATOR'],
  parse: (request) => validate(listVacationRequestsQuerySchema, request.query(), 'query'),
  handle: async (filter, { container }) =>
    HttpResponse.ok(await container.services.vacationRequests.listAll(filter)),
});

/** POST /vacation-requests/:id/approve */
const approveVacationRequest = endpoint({
  access: ['VALIDATOR'],
  parse: (request) => ({
    id: pathId(request),
    ...validate(approveVacationRequestSchema, request.body(), 'body'),
  }),
  handle: async ({ id, comment }, { principal, container }) => {
    await container.commandBus.dispatch(new ApproveVacationRequestCommand(principal, id, comment));
    return HttpResponse.ok(await container.services.vacationRequests.getById(principal, id));
  },
});

/** POST /vacation-requests/:id/reject */
const rejectVacationRequest = endpoint({
  access: ['VALIDATOR'],
  parse: (request) => ({
    id: pathId(request),
    ...validate(rejectVacationRequestSchema, request.body(), 'body'),
  }),
  handle: async ({ id, comment }, { principal, container }) => {
    await container.commandBus.dispatch(new RejectVacationRequestCommand(principal, id, comment));
    return HttpResponse.ok(await container.services.vacationRequests.getById(principal, id));
  },
});

/** GET /vacation-requests/:id/events — audit trail (owner or validator). */
const listVacationRequestEvents = endpoint({
  access: ['REQUESTER', 'VALIDATOR'],
  parse: (request) => ({ id: pathId(request) }),
  handle: async ({ id }, { principal, container }) =>
    HttpResponse.ok({ items: await container.services.vacationRequests.events(principal, id) }),
});

/** GET /team-calendar — who is away (approved + pending) in a window of at most 92 days. */
const getTeamCalendar = endpoint({
  access: ['REQUESTER', 'VALIDATOR'],
  parse: (request) => validate(teamCalendarQuerySchema, request.query(), 'query'),
  handle: async ({ from, to }, { container }) =>
    HttpResponse.ok({ items: await container.services.vacationRequests.teamCalendar(from, to) }),
});

export const createVacationRequestParser = createVacationRequest.parser;
export const createVacationRequestHandler = createVacationRequest.handler;
export const listMyVacationRequestsParser = listMyVacationRequests.parser;
export const listMyVacationRequestsHandler = listMyVacationRequests.handler;
export const listVacationRequestsParser = listVacationRequests.parser;
export const listVacationRequestsHandler = listVacationRequests.handler;
export const approveVacationRequestParser = approveVacationRequest.parser;
export const approveVacationRequestHandler = approveVacationRequest.handler;
export const rejectVacationRequestParser = rejectVacationRequest.parser;
export const rejectVacationRequestHandler = rejectVacationRequest.handler;
export const listVacationRequestEventsParser = listVacationRequestEvents.parser;
export const listVacationRequestEventsHandler = listVacationRequestEvents.handler;
export const getTeamCalendarParser = getTeamCalendar.parser;
export const getTeamCalendarHandler = getTeamCalendar.handler;
