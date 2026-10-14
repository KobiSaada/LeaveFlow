import { registerAuthModule } from '../modules/auth/auth.module';
import { registerUsersModule } from '../modules/users/users.module';
import type { Container } from './container';

/** Each module registers its command/query handlers and event subscribers. */
export function registerModules(container: Container): void {
  registerAuthModule(container);
  registerUsersModule(container);
}
