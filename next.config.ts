import type { NextConfig } from "next";
import createNextIntlPlugin from 'next-intl/plugin';

const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');

const nextConfig: NextConfig = {
  // Native addon: it has to be require()d from node_modules at runtime, not bundled.
  serverExternalPackages: ['@napi-rs/canvas'],

  // The render API reads these with `fs`. Serving them from public/ puts them on the CDN, not in
  // the function's filesystem, so without this the route 500s on Vercel while working locally.
  // Single copy of each file — the browser still loads the same URLs for @font-face.
  outputFileTracingIncludes: {
    '/api/receipt/render': ['./public/*.woff2', './public/Inconsolata.otf', './public/fiscalLogo.png'],
  },
};

export default withNextIntl(nextConfig);
