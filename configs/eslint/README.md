# @safevoices/configs-eslint

Shared ESLint configuration for the monorepo workspace, providing consistent code quality and style enforcement across all applications and packages.

## 📋 Overview

This package contains ESLint configurations tailored for different environments within the monorepo:

- **Base configuration** - Common rules for all JavaScript/TypeScript projects
- **Next.js configuration** - Specific rules for Next.js applications
- **React library configuration** - Rules optimized for React component libraries

## 🛠️ Available Configurations

### Base Configuration (`base.js`)

- Core ESLint rules for JavaScript and TypeScript
- Import/export rules and best practices
- Code style and formatting rules
- Performance and security recommendations

### Next.js Configuration (`next.js`)

- Extends base configuration
- Next.js specific rules and optimizations
- React hooks and JSX rules
- Next.js best practices

### React Internal Configuration (`react-internal.js`)

- Optimized for React component libraries
- Internal package development rules
- Component and hook best practices
- Library-specific optimizations

## 📦 Usage

### In Applications

Add to your `eslint.config.js`:

```js
import { baseConfig } from '@safevoices/configs-eslint/base';
import { nextConfig } from '@safevoices/configs-eslint/next';

export default [
    ...baseConfig,
    ...nextConfig,
    // Your custom rules
];
```

### In Packages

For React libraries:

```js
import { baseConfig } from '@safevoices/configs-eslint/base';
import { reactInternalConfig } from '@safevoices/configs-eslint/react-internal';

export default [...baseConfig, ...reactInternalConfig];
```

## 🔧 Rules Overview

### Key Features

- **TypeScript Integration** - Full TypeScript support with type checking
- **Import Organization** - Automatic import sorting and grouping
- **React Best Practices** - React-specific rules and patterns
- **Performance Rules** - Optimizations for bundle size and runtime
- **Accessibility** - Basic accessibility checks for React components
- **Code Style** - Consistent formatting and style enforcement

### Rule Categories

- **Error Prevention** - Rules that catch common bugs and issues
- **Code Quality** - Rules that improve code maintainability
- **Performance** - Rules that help with optimization
- **Style** - Consistent code formatting and structure

## 🚀 Development

### Adding New Rules

1. Identify the appropriate configuration file
2. Add the rule with proper justification
3. Test across all consuming packages
4. Update documentation

### Testing Changes

```bash
# Test ESLint configuration
pnpm lint

# Fix auto-fixable issues
pnpm lint:fix
```

## 📚 Dependencies

This package includes:

- `eslint` - Core linting engine
- `@typescript-eslint/parser` - TypeScript parser
- `@typescript-eslint/eslint-plugin` - TypeScript rules
- `eslint-plugin-react` - React-specific rules
- `eslint-plugin-react-hooks` - React hooks rules
- `eslint-plugin-import` - Import/export rules

## 🤝 Contributing

When modifying ESLint configurations:

1. Ensure changes work across all applications
2. Document the reasoning for rule changes
3. Test with both development and build processes
4. Consider the impact on developer experience

---

Part of the [Monorepo Vite + Next.js + Tailwind CSS + shadcn/ui](../../README.md) starter template.
