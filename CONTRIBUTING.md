Thank you for your interest in contributing to guit-app-api!

Quick guidelines

- Fork the repository and create a feature branch from `main` (or `improvements` for work-in-progress): `git checkout -b feat/your-change`
- Keep PRs focused and small — one logical change per PR.
- Write clear commit messages and include tests when adding behavior.
- Run the test suite before opening a PR:

```bash
cd guit-app
pnpm install
pnpx prisma generate
pnpx prisma migrate dev --name init
pnpm run test
```

Code style

- Follow the existing TypeScript style.
- Run tests and fix linting issues locally before submitting a PR.

Reporting bugs & feature requests

- Open an issue describing the problem or feature, include steps to reproduce, expected vs actual behavior, and relevant logs/snapshots.

Security

- For security issues, please contact the maintainer directly (see `README.md` for contact info) rather than opening a public issue.
