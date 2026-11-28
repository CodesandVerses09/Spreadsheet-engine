# Mini Spreadsheet Engine

A spreadsheet built from scratch: formulas, dependency tracking, and cloud save/load. No spreadsheet libraries.

**Live demo:** https://spreadsheet-engine.yadavshipra690.workers.dev

<!-- TODO: add a screenshot or GIF here -->

## Features
- Interactive grid with click-to-select and double-click-to-edit
- Formulas with correct operator precedence (e.g. `=A1*2+B1`)
- Automatic recalculation: changing a cell updates everything that depends on it
- Circular reference detection (A1 → C1 → A1 is rejected)
- Save and load through a REST API, with shareable links (`/#<sheet-id>`)

## How the engine works
1. **Tokenizer** turns the formula text into tokens.
2. **Recursive descent parser** builds an expression tree and handles operator precedence.
3. **Tree-walking evaluator** computes the value, resolving cell references.
4. **Dependency graph** records which cells depend on which. When a cell changes, a DFS visits only the affected cells and recalculates them in order.
5. **Cycle detection** runs during that traversal and blocks edits that would create a loop.

Cells are stored in a sparse `Record<CellId, Cell>` rather than a 2D array, and each cell keeps its raw input and computed value separately, so the formula bar can show the original formula.

## Architecture
| Layer | Tech | Hosted on |
|---|---|---|
| Frontend | React, TypeScript, Vite, Tailwind | Cloudflare |
| API | Express, TypeScript | Render |
| Database | PostgreSQL | Neon |

API: `POST /sheets`, `GET /sheets/:id`, `PUT /sheets/:id`, `GET /db-check`

## Performance
<!-- TODO: add measured numbers once virtualization/memoization is done -->

## Known limitations
- Anyone with a sheet's link can view and edit it (no authentication yet).
- The API runs on Render's free tier, so the first request after idle can take up to a minute. The app pings the server on page load to reduce this.
- Fixed 10×10 grid.

## Run locally
Frontend:
```bash
npm install
npm run dev
```

Backend:
```bash
cd server
npm install
npm run dev   # TODO: confirm this is your start script
```
Create `server/.env` with your Postgres connection string (variable name as used in your server code). Never commit this file.

## Roadmap
Viewport virtualization, memoized recalculation, authentication and permissions, real-time collaboration.