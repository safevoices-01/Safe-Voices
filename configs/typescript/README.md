# @safevoices/configs-typescript

Shared TypeScript configuration for the monorepo workspace, providing consistent type checking and compilation settings across all applications and packages.

## 📋 Overview

This package contains TypeScript configurations tailored for different environments within the monorepo:

- **Base configuration** - Common TypeScript settings for all projects
- **Next.js configuration** - Optimized settings for Next.js applications
- **React library configuration** - Settings for React component libraries

## 🛠️ Available Configurations

### Base Configuration (`base.json`)

```json
{
    "extends": "@safevoices/configs-typescript/base"
}
```

- Strict type checking enabled
- Modern ECMAScript target (ES2022)
- Path mapping support
- Incremental compilation
- Source maps for debugging

### Next.js Configuration (`nextjs.json`)

```json
{
    "extends": "@safevoices/configs-typescript/nextjs"
}
```

- Extends base configuration
- Next.js specific compiler options
- JSX preservation for Next.js handling
- App Router and Server Components support
- Optimized for Next.js build system

### React Library Configuration (`react-library.json`)

```json
{
    "extends": "@safevoices/configs-typescript/react-library"
}
```

- Optimized for component library development
- Declaration file generation
- Stricter type checking for public APIs
- Library-specific module resolution

## 📦 Usage

### In Applications

#### Next.js Application

```json
// tsconfig.json
{
    "extends": "@safevoices/configs-typescript/nextjs",
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["./*"]
        }
    },
    "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
    "exclude": ["node_modules"]
}
```

#### Vite Application

```json
// tsconfig.json
{
    "extends": "@safevoices/configs-typescript/base",
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["./src/*"]
        }
    },
    "include": ["src/**/*", "vite.config.ts"],
    "exclude": ["node_modules", "dist"]
}
```

### In Packages

#### UI Component Library

```json
// tsconfig.json
{
    "extends": "@safevoices/configs-typescript/react-library",
    "compilerOptions": {
        "outDir": "dist",
        "declarationDir": "dist/types"
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist", "**/*.test.*"]
}
```

## 🔧 Configuration Details

### Compiler Options

#### Type Checking

- `strict: true` - Enable all strict type checking options
- `noUncheckedIndexedAccess: true` - Stricter array/object access
- `exactOptionalPropertyTypes: true` - Exact optional property handling

#### Module Resolution

- `moduleResolution: "bundler"` - Modern module resolution
- `allowImportingTsExtensions: true` - Import .ts files directly
- `resolveJsonModule: true` - Import JSON files as modules

#### Emit Options

- `declaration: true` - Generate .d.ts files
- `declarationMap: true` - Source maps for declarations
- `sourceMap: true` - Generate source maps for debugging

#### JSX Support

- `jsx: "react-jsx"` - Modern JSX transform
- `jsxImportSource: "react"` - React JSX runtime

### Path Mapping

All configurations support path mapping for cleaner imports:

```typescript
// Instead of
import { Button } from '../../../components/ui/button';

// You can use
import { Button } from '@/components/ui/button';
```

## 🚀 Development

### Adding New Configurations

1. Create new configuration file in appropriate directory
2. Extend from base configuration when possible
3. Document specific use cases and requirements
4. Test with target applications/packages

### Customizing for Your Project

You can extend these configurations in your project:

```json
{
    "extends": "@safevoices/configs-typescript/base",
    "compilerOptions": {
        "baseUrl": ".",
        "paths": {
            "@/*": ["./src/*"],
            "@ui/*": ["./src/components/ui/*"]
        }
        // Additional custom options
    }
}
```

## 🎯 Features

### Modern TypeScript Features

- **Template Literal Types** - Advanced string manipulation
- **Conditional Types** - Type-level logic
- **Mapped Types** - Transform existing types
- **Utility Types** - Built-in type helpers

### Development Experience

- **Incremental Compilation** - Faster rebuilds
- **Composite Projects** - Multi-project builds
- **Project References** - Inter-project dependencies
- **Watch Mode** - File system monitoring

### Build Optimization

- **Tree Shaking** - Dead code elimination
- **Code Splitting** - Bundle optimization
- **Source Maps** - Debug support in production
- **Declaration Merging** - Flexible type definitions

## 📚 Dependencies

This package includes TypeScript version `~5.8.3` as a peer dependency.

## 🤝 Contributing

When modifying TypeScript configurations:

1. Ensure backward compatibility
2. Test with all consuming applications and packages
3. Document breaking changes
4. Consider impact on build performance
5. Update example usage as needed

### Testing Configuration Changes

```bash
# Type check all packages
pnpm typecheck

# Build all packages to verify configuration
pnpm build
```

---

Part of the [Safe Voices monorepo](../../README.md) (Next.js, tRPC, Prisma, shared configs).
