# fiscal-printer-sim
NextJS app for making fiscal receipts. Law violations do apply, Fair use only


This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Authentication setup

This project now requires Google OAuth to access any authenticated page. Before running the app you must configure the following environment variables (locally in a `.env.local` file and in Vercel's dashboard for production builds):

| Variable | Description |
| --- | --- |
| `GOOGLE_CLIENT_ID` | OAuth client ID created in the Google Cloud Console. |
| `GOOGLE_CLIENT_SECRET` | OAuth client secret paired with the client ID. |
| `AUTH_SESSION_SECRET` | A long random string used to sign the app's session cookies. |
| `RECEIPT_API_KEY` | Shared secret for the receipt render API. Unset means that endpoint refuses every request. |

When developing locally, add these values to `.env.local` and restart the dev server so the environment is updated. On Vercel, set the same keys under **Project Settings → Environment Variables** and redeploy.

To sign in, visit `/login` and click **Continue with Google**. Successful authentication redirects you back to the locale-specific homepage (defaults to `/en`).

## Receipt render API

`POST /api/receipt/render` renders a receipt to a PNG through the same code the live preview
uses, so an image fetched here matches one downloaded from the UI.

```bash
curl -sS -X POST http://localhost:3000/api/receipt/render \
  -H 'content-type: application/json' \
  -H "x-api-key: $RECEIPT_API_KEY" \
  -d '{"items":[{"name":"Кафе","quantity":2,"price":3.5,"vatType":"A","isDomestic":false}]}' \
  -o receipt.png
```

The body is either a bare receipt object or the UI's export envelope (`{kind, version, data}`),
and every absent field falls back to the default receipt — send only what you care about. `date`
and `time` default to the current clock. Responses are `image/png`; failures are JSON.

| Response header | Meaning |
| --- | --- |
| `X-Receipt-Width` / `X-Receipt-Height` | Rendered pixel dimensions. |
| `X-Receipt-Defaulted-Fields` | Fields you omitted or sent malformed, filled from the defaults. |
| `X-Receipt-Font-Fallback` | Families this runtime has no face for, rendered in `PixelFont` instead. |

Only `PixelFont` and `PixelFontWide` are bundled. A deployed container has no system fonts, so a
receipt asking for `Courier New` renders in `PixelFont` there and reports it in the header, even
though the same request may use the real face on a developer machine. Register additional
families in `src/lib/receipt-canvas-node.ts` to change that.

Status codes: `400` invalid JSON, a body that doesn't describe a receipt, or a datamatrix payload
that won't encode; `401` bad or missing key; `413` body over 256KB; `503` `RECEIPT_API_KEY` unset.

## Getting Started

First, install dependencies and run the development server:

```bash
pnpm install
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `src/app/[locale]/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
