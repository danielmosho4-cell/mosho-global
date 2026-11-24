# Mosho Global

An events website where people browse events and buy tickets. Built with React + Vite, with Supabase for the database,
login, image storage and payment functions. Deploys to Vercel as a static site.

## What it does

- **Visitors**: browse upcoming events, filter by city, open an event and pick tickets.
- **Buyers**: create an account, pay with Paystack (free tickets skip payment), and see entry codes under **My tickets**.
- **Organizers**: create events with several ticket types, upload a cover image, put tickets on sale or pause them, see sales,
  and check guests in by entry code.
- **Safe by design**: ticket counts are locked in the database, so two people can't buy the last ticket. Unpaid orders hold
  tickets for 15 minutes, then release them.

## Run locally

```bash
pnpm install
cp .env.example .env     # the two values are already filled in for the Mosho Event Global project
pnpm dev                 # http://localhost:3000
```

## Deploy to Vercel

1. Import this repo in Vercel. Leave the root directory as it is. `vercel.json` sets the build.
2. Add two environment variables (Settings, Environment Variables), using the values in `.env.example`:
   `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
3. In Supabase, open Authentication, then URL Configuration, and set **Site URL** to your Vercel address. Add the same
   address under **Redirect URLs**. Without this, email confirmation links won't return to your site.

## Sign-in setup (Supabase)

Sign-in, sign-up, "Resend confirmation email" and "Forgot your password?" are built in. For the email links to work:

1. Authentication, then URL Configuration: set **Site URL** to your live address and add it under **Redirect URLs**
   (also add `https://YOUR-ADDRESS/reset-password`).
2. Supabase's built-in email sender allows only a few emails per hour. For real use, add your own SMTP provider under
   Authentication, then Emails, then SMTP Settings.
3. To let people sign up without confirming their email (easier while testing), turn off **Confirm email** under
   Authentication, then Sign In / Providers, then Email.
4. Turn on **Leaked password protection** under Authentication, then Password security.

## Deploy from the zip

Vercel's website doesn't accept zip uploads. Use either way:

- **Command line (uses the zip directly):** unzip, open a terminal in the folder, then run
  `npx vercel` (first deploy) and `npx vercel --prod` (live). When asked, add the two `VITE_` variables from `.env.example`.
- **GitHub:** push the folder to a repository and import it at vercel.com/new.

Then add the two `VITE_` variables in Vercel (Settings, Environment Variables) if you haven't already.

## Deploy the payment functions

The three functions in `supabase/functions` must be deployed to Supabase before ticket buying works. Either run
`supabase functions deploy create-checkout verify-payment` and `supabase functions deploy paystack-webhook --no-verify-jwt`
(after `supabase link --project-ref ibvikjvicvbxgydynlir`), or paste each file into Edge Functions, then Deploy a new function,
in the Supabase dashboard. Turn **Verify JWT** off for `paystack-webhook` only.

## Take payments (Paystack)

Payments run in Supabase Edge Functions, so no secret ever reaches the browser or Vercel.

1. Create a Paystack account and copy your **secret key**.
2. In Supabase, open Edge Functions, then Secrets, and add:
   - `PAYSTACK_SECRET_KEY`: your Paystack secret key
   - `SITE_URL`: your Vercel address, for example `https://mosho-global.vercel.app`
3. In the Paystack dashboard, set the webhook URL to
   `https://ibvikjvicvbxgydynlir.supabase.co/functions/v1/paystack-webhook`.

Until step 2 is done, free tickets work and paid tickets show "Online payments aren't switched on yet."

## Project layout

```
client/src/pages        Home, EventPage, Login, ResetPassword, Tickets, CheckoutComplete, Dashboard, NewEvent, EditEvent, ManageEvent
client/src/components   Layout, EventTicket (the ticket-stub card), RequireAuth
client/src/lib          Supabase client, auth, formatting, types
supabase/migrations     The database: tables, row-level security, order and ticket functions, image storage
supabase/functions      create-checkout, verify-payment, paystack-webhook
```

## Notes

- Money is stored in kobo (1/100 naira) as whole numbers.
- Entry codes are shown as text. Add a QR code library if you want scannable codes.
- The lockfile was removed during the rewrite. Run `pnpm install` once and commit the new `pnpm-lock.yaml`.
- To regenerate TypeScript types for the database: `supabase gen types typescript --project-id ibvikjvicvbxgydynlir`.
