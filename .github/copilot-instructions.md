
# Copilot Instructions for `basic-client` VS Code Extension

## Project Overview

- **Type:** VS Code extension (TypeScript, Webpack bundled)
- **Purpose:** Provides a away for users to generate http request to restful api endpoints. 
- **Key files:**
	- `src/extension.ts`: Main entry point, implements the extension's activation and command registration.
	- `src/test/extension.test.ts`: Mocha-based test suite for extension logic.
	- `webpack.config.js`: Bundles the extension for VS Code.
	- `package.json`: Declares commands, scripts, dependencies, and VS Code contributions.

## Build, Test, and Debug Workflows

- **Build:**  
	- `npm run compile` (bundles with Webpack, output to `dist/`)
	- `npm run watch` (incremental build on file changes)
- **Test:**  
	- `npm test` (runs Mocha tests via `vscode-test`)
	- `npm run watch-tests` (watches and rebuilds tests)
	- Tests are located in `src/test/`
- **Lint:**  
	- `npm run lint` (uses ESLint with TypeScript rules from `eslint.config.mjs`)
- **Debug/Run Extension:**  
	- Press `F5` in VS Code to launch an Extension Development Host.
	- The default launch config (`.vscode/launch.json`) runs the extension after building.
	- Set breakpoints in `src/extension.ts` for debugging.

## Commands and Activation

- **Command:**  
	- `basic-client.helloWorld` (shows a "Hello World" message)
	- Registered in `package.json` under `contributes.commands`
- **Activation:**  
	- Extension activates on command execution (see `activate` in `src/extension.ts`).

## Project Conventions

- **TypeScript strict mode** is enabled (`tsconfig.json`).
- **Webpack** is used for bundling; only `dist/extension.js` is shipped.
- **Source files** (`src/`), tests (`src/test/`), and config files are excluded from the published extension via `.vscodeignore`.
- **ESLint** enforces naming conventions and code style (see `eslint.config.mjs`).

## Developer Tips

- **Recommended Extensions:**  
	- `amodio.tsl-problem-matcher`, `ms-vscode.extension-test-runner`, `dbaeumer.vscode-eslint`
- **Quickstart:**  
	- See `vsc-extension-quickstart.md` for step-by-step setup, running, and testing instructions.
- **Release notes:**  
	- Maintain `CHANGELOG.md` for all notable changes.

## Example Patterns

- **Command registration:**  
	See `src/extension.ts` for how to register and implement VS Code commands.
- **Testing:**  
	Use Mocha/Assert in `src/test/extension.test.ts` for extension logic.