import type { Container } from './container';

/** Each module registers its command/query handlers and event subscribers here. */
export function registerModules(_container: Container): void {
  // Modules are added as they are implemented (auth, users, vacation-requests, notifications).
}
