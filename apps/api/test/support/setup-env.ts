import { config as loadDotenv } from 'dotenv';

loadDotenv({ quiet: true });
// The application under test talks to the test database only.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL ??= 'silent';
