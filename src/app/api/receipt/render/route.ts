/**
 * POST /api/receipt/render — a receipt as JSON in, a 384px PNG out.
 *
 * Renders through the same `renderReceipt` the live preview uses, so an image fetched here and
 * one downloaded from the UI are the same receipt rather than two implementations of one.
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { timingSafeEqual } from 'node:crypto';
import { parseReceiptValue } from '@/lib/receipt-file';
import { currentDateTime } from '@/lib/receipt-presets';
import { renderReceiptPng } from '@/lib/receipt-canvas-node';

// @napi-rs/canvas is a native addon, so this can never run on the edge runtime.
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * `datamatrixCode` is unbounded and item names are free text, so the body is capped before it is
 * read rather than after. Generous next to a realistic receipt — the default preset's payload is
 * ~180 characters — and small enough that nothing large is ever buffered.
 */
const MAX_BODY_BYTES = 256 * 1024;

function json(body: unknown, status: number) {
  return NextResponse.json(body, { status, headers: { 'Cache-Control': 'no-store' } });
}

/**
 * Constant-time API key check.
 *
 * An unset key answers 503 rather than allowing the request: a deployment that forgot to
 * configure the secret should fail closed, not quietly serve fiscal receipt images to anyone.
 * Lengths are compared first because `timingSafeEqual` throws on a mismatch — that leaks the
 * key's length and nothing more, which is the same trade `validateSessionToken` already makes.
 */
function authorize(request: NextRequest): NextResponse | null {
  const expected = process.env.RECEIPT_API_KEY;
  if (!expected) {
    console.error('RECEIPT_API_KEY is not set; refusing to render');
    return json({ error: 'Receipt rendering is not configured' }, 503);
  }

  const provided = request.headers.get('x-api-key') ?? '';
  const expectedBytes = Buffer.from(expected, 'utf8');
  const providedBytes = Buffer.from(provided, 'utf8');

  if (expectedBytes.length !== providedBytes.length || !timingSafeEqual(expectedBytes, providedBytes)) {
    return json({ error: 'Invalid or missing API key' }, 401);
  }

  return null;
}

export async function POST(request: NextRequest) {
  const unauthorized = authorize(request);
  if (unauthorized) {
    return unauthorized;
  }

  const declaredLength = Number(request.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
    return json({ error: `Body exceeds ${MAX_BODY_BYTES} bytes` }, 413);
  }

  const raw = await request.text();
  // A chunked request declares no length, so the real check is on what actually arrived.
  if (Buffer.byteLength(raw, 'utf8') > MAX_BODY_BYTES) {
    return json({ error: `Body exceeds ${MAX_BODY_BYTES} bytes` }, 413);
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return json({ error: 'Body is not valid JSON' }, 400);
  }

  // Accepts both the UI's export envelope ({kind, version, data}) and a bare receipt object, and
  // fills anything absent from the defaults — so a caller can send just the fields they care about.
  const parsed = parseReceiptValue(body);
  if (parsed.status !== 'ok') {
    return json({ error: 'Body does not describe a receipt', reason: parsed.status }, 400);
  }

  const { data, filledFields } = parsed;

  // date/time default to '' on purpose: the UI stamps them on mount, because a module-level
  // `new Date()` goes stale in a long-lived process. The API is that same mount moment.
  const now = currentDateTime();
  const receipt = {
    ...data,
    date: data.date || now.date,
    time: data.time || now.time,
  };

  let result;
  try {
    result = await renderReceiptPng(receipt);
  } catch (error) {
    console.error('Failed to render receipt', error);
    return json({ error: 'Failed to render receipt' }, 500);
  }

  if (!result.ok) {
    // The preview draws this onto the canvas in red; an API answering 200 with the error baked
    // into the pixels would be a worse lie than a 400. `error` is an i18n key from datamatrix.ts.
    return json({ error: result.failure.key, values: result.failure.values ?? {} }, 400);
  }

  const headers = new Headers({
    'Content-Type': 'image/png',
    'Content-Length': String(result.png.byteLength),
    'Content-Disposition': `inline; filename="receipt-${encodeURIComponent(receipt.receiptNumber)}.png"`,
    'Cache-Control': 'no-store',
    'X-Receipt-Width': String(result.width),
    'X-Receipt-Height': String(result.height),
  });
  // Which fields the caller under-specified, and which font families this runtime couldn't
  // produce — both are things a caller would otherwise have to notice by eye.
  if (filledFields.length > 0) {
    headers.set('X-Receipt-Defaulted-Fields', filledFields.join(','));
  }
  if (result.fontFallbacks.length > 0) {
    headers.set('X-Receipt-Font-Fallback', result.fontFallbacks.join(','));
  }

  return new NextResponse(new Uint8Array(result.png), { status: 200, headers });
}
