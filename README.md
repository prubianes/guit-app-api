# guit-app-api

A lightweight proof-of-concept backend for a personal finance tracker (money-tracking) app.

guit-app-api provides a RESTful API for users, accounts, categories, transactions, and budgets. It's implemented in Node.js with TypeScript and Prisma and is intended for local development, testing, and experimentation — includes an OpenAPI specification, example requests, and tests to help you get started quickly.

## Table of Contents

- [Installation](#installation)
- [Usage](#usage)
- [Database Schema](#database-schema) 
- [API Endpoints](#api-endpoints)
- [Environment Variables](#environment-variables)
- [Running Tests](#running-tests)
- [License](#license)

## Installation

Prerequisites

- Node.js 16+ (LTS recommended)
- pnpm (https://pnpm.io/) installed globally (or use `npx`/`corepack`)
- PostgreSQL (or another supported database) for local development

Quick start

1. Clone the repository and change into it:
```bash
git clone https://github.com/prubianes/guit-app-api.git
cd guit-app-api
```

2. Copy the example environment file and edit `DATABASE_URL`:
```bash
cp .env.example .env
# Edit .env and set a real DATABASE_URL (see .env.example)
```

3. Install dependencies and generate Prisma client:
```bash
pnpm install
pnpx prisma generate
```

4. Run database migrations (creates local dev database schema):
```bash
pnpx prisma migrate dev --name init
```

5. Start the development server (hot-reload):
```bash
pnpm run dev
```

Production build

```bash
pnpm run build
PNODE_ENV=production pnpm start
```

Docker (optional)

Use Docker Compose to run a Postgres database and the app for local development. Example `docker-compose.yml` (create locally):

```yaml
version: '3.8'
services:
    db:
        image: postgres:15
        restart: always
        environment:
            POSTGRES_USER: guit
            POSTGRES_PASSWORD: guitpass
            POSTGRES_DB: guitdb
        ports:
            - '5432:5432'

    app:
        build: .
        environment:
            DATABASE_URL: postgres://guit:guitpass@db:5432/guitdb?schema=public
        ports:
            - '3000:3000'
        depends_on:
            - db
```

Notes

- Use `TEST_DATABASE_URL` for test runs if you want an isolated test database.
- If migrations prompt for confirmation, follow the interactive prompts or run with `--preview-feature`/appropriate flags for your Prisma version.
- The example `.env.example` file in the repo shows required env vars and defaults.

## Usage

Run the app locally (development)

- Ensure you've copied `.env.example` to `.env` and configured `DATABASE_URL`.
- From the project root, change into the app folder and start the dev server (hot reload):

```bash
cd guit-app
pnpm install
pnpm run dev
# the server listens on the port configured in $PORT (default 3000)
```

Open the API

- Visit `http://localhost:3000` to access the app.
- The OpenAPI spec is available at `static/openapi.json` — to view it with Swagger UI, open https://petstore.swagger.io/ and paste the URL `http://localhost:3000/static/openapi.json` (or open the local file in Redoc).

Production

Build and run a production bundle:

```bash
cd guit-app
pnpm run build || echo "no build script; run production runner if applicable"
NODE_ENV=production pnpm start || echo "use your preferred process manager"
```

Useful scripts (from `guit-app/package.json`)

- `pnpm --filter guit-app dev` or run inside `guit-app`: `pnpm run dev` — development server (uses `tsx watch src/index.ts`).
- `pnpm --filter guit-app test` or inside `guit-app`: `pnpm run test` — run tests with Vitest.
- `pnpm --filter guit-app coverage` or inside `guit-app`: `pnpm run coverage` — run coverage report.

Notes

- The dev server uses `tsx` for TypeScript hot reloading (`dev` script). There is no `build` script in `guit-app/package.json` by default; add one if you want a bundled production output.
- Set `PORT` in your `.env` if you need a different port.
- For CI or tests, consider using `TEST_DATABASE_URL` so tests run against an isolated database.

## Database Schema
```mermaid
erDiagram
    USER {
        int id
        string name
        string email
        string password
        datetime createdAt
        datetime updatedAt
    }
    ACCOUNT {
        int id
        int userId
        string name
        string type
        float balance
        datetime createdAt
        datetime updatedAt
    }
    CATEGORY {
        int id
        string name
        string type
    }
    TRANSACTION {
        int id
        int userId
        int accountId
        int categoryId
        float amount
        string type
        datetime date
        string description
        datetime createdAt
        datetime updatedAt
    }
    BUDGET {
        int id
        int userId
        int categoryId
        float amount
        string period
        datetime createdAt
        datetime updatedAt
    }

    USER ||--o{ ACCOUNT : "has"
    USER ||--o{ TRANSACTION : "has"
    USER ||--o{ BUDGET : "has"
    ACCOUNT ||--o{ TRANSACTION : "has"
    CATEGORY ||--o{ TRANSACTION : "categorizes"
    CATEGORY ||--o{ BUDGET : "is used in"
```

## API Endpoints

### Users
- `GET /user` - Retrieve all users
- `GET /user/:id` - Retrieve a user by ID
- `POST /user` - Create a new user
- `PUT /user/:id` - Update a user by ID
- `DELETE /user/:id` - Delete a user by ID

### Accounts
- `GET /user/:id/account` - Retrieve all accounts for a user
- `GET /user/:id/account/:accountId` - Retrieve an account by ID
- `POST /user/:id/account` - Create a new account
- `PUT /user/:id/account/:accountId` - Update an account by ID
- `DELETE /user/:id/account/:accountId` - Delete an account by ID

### Categories
- `GET /category` - Retrieve all categories
- `GET /category/:id` - Retrieve a category by ID
- `POST /category` - Create a new category
- `PUT /category/:id` - Update a category by ID
- `DELETE /category/:id` - Delete a category by ID

### Transactions
- `GET /user/:id/transactions` - Retrieve all transactions for a user
- `GET /user/:id/transactions/:transactionId` - Retrieve a transaction by ID
- `POST /user/:id/transactions` - Create a new transaction
- `PUT /user/:id/transactions/:transactionId` - Update a transaction by ID
- `DELETE /user/:id/transactions/:transactionId` - Delete a transaction by ID

### Budgets
- `GET /user/:id/budget` - Retrieve all budgets for a user
- `GET /user/:id/budget/:budgetId` - Retrieve a budget by ID
- `POST /user/:id/budget` - Create a new budget
- `PUT /user/:id/budget/:budgetId` - Update a budget by ID
- `DELETE /user/:id/budget/:budgetId` - Delete a budget by ID

## API Examples

Here are a few quick `curl` examples to get started. These assume the server is running on `http://localhost:3000`.

- Create a user

```bash
curl -s -X POST http://localhost:3000/user \
    -H "Content-Type: application/json" \
    -d '{"name":"Alice","email":"alice@example.com","password":"secret"}'
```

- List a user's transactions

```bash
curl -s http://localhost:3000/user/1/transactions
```

- Create a transaction for a user

```bash
curl -s -X POST http://localhost:3000/user/1/transactions \
    -H "Content-Type: application/json" \
    -d '{"accountId":1,"categoryId":2,"amount":-12.50,"type":"expense","date":"2025-12-01","description":"Lunch"}'
```

OpenAPI / Swagger

- The JSON OpenAPI spec is available at `static/openapi.json` (local file) or served at `http://localhost:3000/static/openapi.json` when running the app. To view it quickly use https://petstore.swagger.io/ or Redoc.


## Environment Variables

Create a `.env` file in the root directory and add the following variables:
* DATABASE_URL="your-database-url"

See `.env.example` for a ready-to-copy template and recommended defaults.

## Prisma & Database setup

This project uses Prisma as the ORM. Basic local setup:

1. Generate the Prisma client after installing dependencies:

```bash
pnpx prisma generate
```

2. Apply migrations to your development database (interactive):

```bash
pnpx prisma migrate dev --name init
```

Notes:
- Use `TEST_DATABASE_URL` in `.env` to point tests at an isolated database.
- If you prefer to apply migrations non-interactively in CI or production, use `pnpx prisma migrate deploy`.
- If you have seed scripts, run them with `pnpx prisma db seed` after migrations.

## Running Tests & Continuous Integration

Local tests

Run tests from the `guit-app` folder. Set `TEST_DATABASE_URL` to a test database before running tests to avoid mutating your development DB.

```bash
cd guit-app
export TEST_DATABASE_URL="postgresql://guit:guitpass@localhost:5433/guit_test?schema=public"
pnpm run test
```

GitHub Actions (example)

An example CI workflow is provided at `.github/workflows/ci.yml`. It installs dependencies, starts a PostgreSQL service, generates the Prisma client, and runs the test suite.

Basic checklist for CI

- Ensure a service DB is available and `TEST_DATABASE_URL`/`DATABASE_URL` is set.
- Run `pnpx prisma migrate deploy` (or use `--skip-generate`/`--skip-seed` depending on your flow).
- Run `pnpm --filter guit-app test` or `cd guit-app && pnpm run test`.


## Running Tests

To run the tests, use the following command:

```sh
pnpm run test
```

If tests require a separate DB, set `TEST_DATABASE_URL` as shown above.

## Troubleshooting / FAQ

- Database connection errors: verify `DATABASE_URL`/`TEST_DATABASE_URL` in `.env` and ensure Postgres is running on the expected port.
- Migrations fail or conflict: delete local migration lock files only if you understand the migration history. Prefer `prisma migrate resolve` or recreate local dev DB when safe.
- Port already in use: change `PORT` in `.env` or stop the process occupying the port with `lsof -i :3000` then `kill`.
- Prisma client not found: run `pnpx prisma generate` after installing dependencies.

## Changelog & Releases

- For releases, use GitHub Releases and follow semantic versioning (MAJOR.MINOR.PATCH).
- Consider maintaining a `CHANGELOG.md` with notable changes for each release.

## Maintainers & Contact

- **Maintainer:** Pablo Rubaines — see the repo owner profile for contact details.
- Recommended Node.js version: 16+ (18 LTS recommended). Use `pnpm` as the package manager.

If you want, I can open a PR on the `improvements` branch with these changes and the new files (`.env.example`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, and CI workflow).

# License

This project is licensed under the MIT License. See the LICENSE file for details.

Copyright (c) 2024 Pablo Rubaines