import { config as loadDotenv } from 'dotenv';

loadDotenv({ quiet: true });
// The application under test talks to the test database only.
process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
process.env.NODE_ENV = 'test';
// .env sets LOG_LEVEL for development; tests stay quiet unless TEST_LOG_LEVEL asks otherwise.
process.env.LOG_LEVEL = process.env.TEST_LOG_LEVEL ?? 'silent';
