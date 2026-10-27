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

The project uses the managed Webdev starter with React, Express, tRPC, Drizzle, and a MySQL-compatible database configuration. The current visual reservation and availability interactions work in the browser session; replace the starter location, phone number, and availability values before production use.
