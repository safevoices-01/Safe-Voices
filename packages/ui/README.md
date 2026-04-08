# @safevoices/ui

Reusable UI package for shared components and styles.

## Usage

- Import styles first in your app entry/layout:
  - `import "@safevoices/ui/styles.css"`
- Then import components and utilities:
  - `import { Button, Dialog, Select, Form, Toast, cn } from "@safevoices/ui"`

## Commands

- `pnpm --filter @safevoices/ui typecheck`
- `pnpm --filter @safevoices/ui lint`

## Notes

- This package is generated from COSS registries via `shadcn`.
- If you refresh COSS primitives, run:
  - `pnpm dlx shadcn@latest add @coss/style -o -y`
  - `pnpm dlx shadcn@latest add @coss/ui -y`
