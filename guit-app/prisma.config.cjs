// Prisma 7 configuration for CLI commands (migrations, etc)
const isTest = process.env.NODE_ENV === 'test';
const defaultUrl = isTest ? 'file:./prisma/test.db' : 'file:./prisma/dev.db';

module.exports = {
  datasource: {
    url: (isTest ? process.env.TEST_DATABASE_URL : process.env.DATABASE_URL) || defaultUrl,
  },
};
