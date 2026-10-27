# mosho global

Modern responsive website for a mobile phone charging station business.

## Run locally

This is a React/Vite + Express project. Do **not** open `client/index.html` directly in a browser; the absolute asset paths and `/api/platform/config.js` require the development server.

```bash
pnpm install
pnpm dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Validate and build

```bash
pnpm check
pnpm build
```

## Deploy on Vercel

The repository includes `vercel.json`. Import the repository into Vercel with the root directory left at the project root. Vercel will install with the lockfile, run `pnpm build:static`, publish `dist/public`, and route client-side paths back to the React entrypoint.

Do not set the output directory to `dist` manually; the frontend is emitted to `dist/public` by the Vite configuration.

The project uses the managed Webdev starter with React, Express, tRPC, Drizzle, and a MySQL-compatible database configuration. The current visual reservation and availability interactions work in the browser session; replace the starter location, phone number, and availability values before production use.
