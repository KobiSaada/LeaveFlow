import { loadEnv, startDevServer } from 'commoneventframework';

// Must run before anything reads process.env; everything below reads configuration lazily.
const envReady = loadEnv();

import './generated/HandlerRegistry';
import * as path from 'node:path';
import type { APIGatewayProxyStructuredResultV2, Context } from 'commoneventframework';
import type { LambdaEvent } from 'commoneventframework/dist/types/commonEvent';
import { createHttpHandler } from './app';

// root.yaml sits next to this file in src/ (dev) and in dist/ (cef-build copies it there).
const httpHandler = createHttpHandler({ rootYamlPath: path.join(__dirname, 'root.yaml') });

/** AWS Lambda handler (API Gateway v1/v2, direct invoke) — also driven by CEF's local dev server. */
export const handler = async (
  event: LambdaEvent,
  context: Context,
): Promise<APIGatewayProxyStructuredResultV2> => {
  await envReady;
  return httpHandler(event, context);
};

if (process.argv.includes('--local')) {
  startDevServer(handler);
}
