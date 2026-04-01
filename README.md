# spyder

`spyder` is the local assistant component line of the Funesterie ecosystem.

The published npm package lives in `packages/spyder/` and exposes a small programmable server surface for local runtimes, memory-backed packet handling and optional bridges to A11.

Do not publish from the repository root.
The canonical npm package source for `@funeste38/spyder` is `packages/spyder/`.

## Published Package

```bash
npm install @funeste38/spyder
```

## Repository Focus

- local assistant runtime primitives
- packet and bridge experimentation
- lightweight integration points for A11
- a package that can stay small and embed easily into other tools

## Local Development

```bash
cd packages/spyder
npm install
npm run build
npm test
```

Useful commands:

Behavior notes:

