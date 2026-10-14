// Creates apps/api/.env from .env.example on first setup; never overwrites an existing file.
import { copyFileSync, existsSync } from 'node:fs';

const target = 'apps/api/.env';
if (existsSync(target)) {
  console.log(`[setup] ${target} already exists — leaving it untouched.`);
} else {
  copyFileSync('apps/api/.env.example', target);
  console.log(`[setup] Created ${target} from apps/api/.env.example.`);
}
