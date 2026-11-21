# Agent guide: Solar Installation Management System

Before changing this repository, read `.agents/skills/solar-installation-development/SKILL.md`, the applicable specs in `docs/specs/`, and the current code and tests. The skill contains durable project context; check Git and source for current state rather than assuming documented plans are implemented.

- This is a shared hackathon repository. FeV and assistant coordinate the backend; frontend and QA responsibilities are provisional. Agree shared API contracts before parallel work and preserve teammates' changes.
- Use pnpm. Drizzle + local SQLite are the selected database stack. Review migrations and never reset another person's database without explicit permission.
- Enforce domain rules and staff authorization on the server. Never fabricate dynamic metrics or include actual customer data/secrets in commits. Authentication and company workflows are not implied merely by the scaffold.
- Verify relevant tests and a real end-to-end path before claiming a feature works. Record failures and gaps honestly. Do not push without an explicit user request.
