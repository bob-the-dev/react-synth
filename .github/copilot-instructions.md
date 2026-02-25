# Synth - AI Agent Instructions

## Project Overview

React-based synthesizer application built with Vite. This is an experimental project exploring audio synthesis with React.

## Tech Stack

- **Frontend Framework**: React 19.2.4
- **Build Tool**: Vite 7.3.1 with `@vitejs/plugin-react`
- **Build Output**: `build/` directory (configured in vite.config.js)

## Development Workflow

### Starting Development

```bash
npm run dev
```

Note: The dev script needs to be added to package.json

### Building for Production

```bash
npm run build
```

Note: The build script needs to be added to package.json

### Project Structure

This project is in early stages. Expected structure:

- `src/` - Source code (components, hooks, utilities)
- `public/` - Static assets
- `build/` - Production build output (gitignored)

## Code Conventions

### Module System

- Project uses CommonJS (`"type": "commonjs"` in package.json)
- When creating new files, use `require()` and `module.exports` unless migrating to ESM
- Vite config uses ES modules (via `.js` extension with import/export)

### React Best Practices

- Use React 19 features (including new hooks and APIs)
- Prefer functional components with hooks
- For audio synthesis, leverage Web Audio API with React lifecycle hooks

## Missing Setup

The following are not yet configured but should be added:

1. **npm scripts**: Add `dev`, `build`, `preview` scripts to package.json
2. **Source directory**: Create `src/` with entry point (e.g., `main.jsx`)
3. **HTML template**: Create `index.html` in project root for Vite
4. **TypeScript**: Consider adding TypeScript for better type safety with audio APIs
5. **Testing**: No test framework configured yet

## Audio Synthesis Considerations

When implementing synthesizer features:

- Use Web Audio API (`AudioContext`, `OscillatorNode`, etc.)
- Manage audio context lifecycle carefully (user gesture requirement)
- Consider using `useRef` for storing audio nodes across renders
- Clean up audio nodes in cleanup functions to prevent memory leaks

## Dependencies

- React and Vite are installed
- Missing: react-dom (required for React web apps)
- Consider: tone.js or similar audio library for higher-level synthesis abstractions

## Code requirements

There is no need to import React from react, that is not required in React 17 and later. You can directly use JSX without importing React.
