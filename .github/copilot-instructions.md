# Copilot instructions — dramalog

Purpose
- Help GitHub Copilot sessions quickly understand and operate in this repository (Vite + React single-page app).

Quick commands
- Start dev server: npm run dev
- Build production bundle: npm run build
- Preview production build: npm run preview
- Lint (project): npm run lint
- Tests: No test runner configured in package.json. When tests are added, run a single test with your test runner. Examples:
  - Vitest: npx vitest path/to/file.test.{js,ts}  (or npx vitest -t "test name")
  - Jest: npx jest path/to/file.test.js -t "test name"

High-level architecture (big picture)
- Type: Frontend single-page app built with Vite + React (ESM). Entry: src/main.jsx -> mounts <App /> from src/App.jsx.
- UI: Plain React components using .jsx and .css files in src/. Assets live under src/assets/ and public/ for static files (icons.svg, favicon).
- Routing & features: react-router-dom, @supabase/supabase-js, and recharts are listed as dependencies (routing, backend/DB integration, charts). They are present for expected features but are not currently wired into the small demo App component.
- Build system: Vite (vite.config.js) with @vitejs/plugin-react.

Key conventions and repository-specific notes
- Module format: package.json sets "type": "module" — use ESM imports/exports across the codebase.
- JSX files use .jsx extension (not .js) for components.
- Styling: repository currently uses plain CSS files (src/*.css). tailwindcss is present as a devDependency but no tailwind config detected; do not assume Tailwind utilities are available until configured.
- Linting: npm run lint runs ESLint. There is no .eslintrc.* in the repo — adding or updating rules will affect lint runs immediately.
- Dependencies present but unused: Supabase, react-router-dom, and Recharts are in package.json but no code references found in src/ (they are likely planned but not implemented). Copilot should not assume their APIs are already integrated — verify usage before refactoring.
- Entry points and quick inspection list for Copilot: src/main.jsx, src/App.jsx, vite.config.js, package.json, public/icons.svg, src/assets/*.

Other AI/assistant config files
- Searched for common assistant config files (CLAUDE.md, AGENTS.md, .cursorrules, .windsurfrules, CONVENTIONS.md, AIDER_CONVENTIONS.md, .clinerules). None found. If such files are added later, merge their critical rules into this file.

When editing / committing
- After changing package.json, run npm install to update node_modules and package-lock.json.
- Keep commits focused and add the Copilot Co-authored-by trailer if automating commits via tooling.

Notes pulled from README.md
- This project is based on the Vite + React template. The README notes the React Compiler is not enabled (intentionally omitted for performance). That remains accurate.

If you want an MCP server configured
- This is a web frontend app; common useful MCP servers include Playwright (end-to-end tests) or a static-preview server. Ask if you want one configured and which runner (Playwright / Playwright+PWEs / Cypress) — I can add configuration and workflows.

If anything here should be expanded (tests, CI workflows, lint rules, or a Tailwind setup), say which area to focus on and Copilot can add targeted files and guidance.