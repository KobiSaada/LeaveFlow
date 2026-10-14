import { AxiosError, AxiosHeaders } from 'axios';
import { describe, expect, it } from 'vitest';
import { ApiError, toApiError } from './http';

function axiosError(status: number, data: unknown): AxiosError {
  const config = { headers: new AxiosHeaders() };
  return new AxiosError(
    'Request failed',
    'ERR_BAD_RESPONSE',
    config,
    {},
    { status, statusText: '', data, headers: {}, config },
  );
}

describe('toApiError', () => {
  it('maps Problem Details, including field errors and the request id', () => {
    const error = toApiError(
      axiosError(422, {
        type: 'urn:leaveflow:problem:validation-failed',
        title: 'The request contains invalid fields.',
        status: 422,
        code: 'VALIDATION_FAILED',
        errors: [{ field: 'startDate', message: 'Must be a valid date in YYYY-MM-DD format' }],
        requestId: 'req-1',
      }),
    );
    expect(error).toBeInstanceOf(ApiError);
    expect(error).toMatchObject({
      status: 422,
      code: 'VALIDATION_FAILED',
      requestId: 'req-1',
      fieldErrors: { startDate: 'Must be a valid date in YYYY-MM-DD format' },
    });
  });

  it('keeps problem extensions such as the conflicting range', () => {
    const error = toApiError(
      axiosError(409, {
        title: 'Overlap',
        status: 409,
        code: 'VACATION_OVERLAP',
        requestId: 'r',
        conflictingRange: { startDate: '2026-11-09', endDate: '2026-11-13' },
      }),
    );
    expect(error.problem?.conflictingRange).toEqual({
      startDate: '2026-11-09',
      endDate: '2026-11-13',
    });
  });

  it('turns non-problem responses into a generic error and missing responses into a network error', () => {
    expect(toApiError(axiosError(502, '<html>Bad gateway</html>'))).toMatchObject({
      status: 502,
      code: 'INTERNAL_ERROR',
    });
    expect(toApiError(new AxiosError('Network Error', 'ERR_NETWORK'))).toMatchObject({
      status: 0,
      code: 'NETWORK_ERROR',
    });
  });
});
