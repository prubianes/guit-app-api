// Prisma 7 configuration for CLI commands (migrations, etc)
module.exports = {
  datasource: {
    url: process.env.DATABASE_URL || 'file:./prisma/dev.db',
  },
};
