Funesterie Config Language (FCL) - Short Spec

1. File name: `funesterie.fcl`
2. Sections start with `@section` optionally followed by a name: `@service api` or `@env dev`.
3. Key-value syntax: `key = value` (strings or numbers).
4. Lists use `[]` with comma-separated values: `steps = ["api", "web"]`.
5. Comments start with `#` or `//` and extend to end-of-line.
6. Supported sections: `@project`, `@env`, `@service`, `@pipeline`.
7. `@service <name>` supports keys: `type`, `path`, `start`, `port`, `env`, `token`.
8. `@pipeline <name>` supports keys: `description`, `steps` (list of service names).
9. Values can be quoted strings or unquoted tokens (no complex expressions).
10. FCL is intentionally minimal and designed to be parsed without heavy dependencies.

Example:

@service api
  type = node
  path = apps/api
  start = npm run dev
  port = 3000

@pipeline dev-all
  steps = ["api", "web"]
