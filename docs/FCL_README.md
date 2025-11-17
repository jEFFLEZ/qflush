Funesterie Config Language (FCL) - README

FCL is a small, human-friendly format to declare projects, services and pipelines for Funesterie.

Sections:
- `@project` global metadata (name, owner, defaultEnv)
- `@env <name>` environment variables and URLs
- `@service <name>` description of a launchable service (path, start command, port)
- `@pipeline <name>` ordered list of services to run together

Examples:

@project
  name = my-stack
  owner = alice

@env dev
  url = http://localhost:3000

@service api
  type = node
  path = apps/api
  start = pnpm dev:api
  port = 3000

@pipeline dev-all
  steps = ["api"]

Usage:
- Place `funesterie.fcl` in the repo root.
- `qflash compose up` will read `funesterie.fcl` if present and bring up declared services.

This README is minimal and the spec is intentionally small to keep portability.
