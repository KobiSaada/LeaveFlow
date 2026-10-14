/** What an endpoint returns; the entry point turns it into a CEF Response. */
export class HttpResponse {
  constructor(
    readonly status: number,
    readonly body: unknown,
    readonly headers: Record<string, string> = {},
  ) {}

  static ok(body: unknown): HttpResponse {
    return new HttpResponse(200, body);
  }

  static created(body: unknown): HttpResponse {
    return new HttpResponse(201, body);
  }
}
