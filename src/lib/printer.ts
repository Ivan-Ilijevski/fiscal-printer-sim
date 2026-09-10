/**
 * Bluetooth thermal printing — the pure half.
 *
 * No React and no DOM in this module: it holds the tuning constants the transfer needs and one
 * error-to-i18n-key mapping. The live BLE session — the part that touches `navigator` — lives
 * in `src/components/PrinterActions.tsx`.
 */

import {
  BluetoothConnectionError,
  BluetoothUnavailableError,
  PrinterBusyError,
  PrinterDisconnectedError,
  PrinterNotSupportedError,
  PrinterProtocolError,
  PrinterTimeoutError,
  PrinterWriteError,
} from 'web-timini-print/core';
import { DecodeMessage } from '@/lib/datamatrix';

/**
 * Transport tuning, measured on the tested X5h over macOS Bluetooth and matching what TiMini
 * CLI 0.7.4 sends. These are passed explicitly on every `requestPrinter` call because the
 * library's own defaults are deliberately conservative — a 20-byte chunk size, which is safe
 * on any ATT MTU but turns a 384px receipt into thousands of writes. The 50 ms pause after
 * each write is the printer's pacing, not ours: shortening it produces torn rasters.
 */
export const PRINTER_OPTIONS = { chunkSize: 182, delayMs: 50 } as const;

/**
 * Print depth, 1 (lightest) to 5 (darkest). The receipt raster is 1-bit already — every pixel
 * is either paper or ink — so the darkest setting is the one that reproduces it faithfully;
 * anything lower just fades the 1px hairlines and the pixel font's commas.
 */
export const PRINT_BLACKENING = 5;

/**
 * Paper-advance steps sent after the raster, so the printed receipt clears the head far enough
 * to be torn off without losing its last lines. Three is what the reference X5h job uses.
 */
export const FEED_STEPS = 3;

/**
 * Turns anything thrown by the printer stack into an i18n key the UI can paint.
 *
 * This repo already treats "an error is a key plus interpolation values" as its convention for
 * anything a non-English user has to read — see `DecodeMessage` in `src/lib/datamatrix.ts` and
 * how `ReceiptRenderer` renders one with `t(message.key, message.values)`. Doing the same here
 * keeps the printer's English `Error.message` strings out of the interface.
 *
 * Order matters: every class below extends `PrinterError`, so the checks run most-specific
 * first and the generic fallback only catches things that are not printer errors at all
 * (a `DOMException` from the chooser being dismissed, say).
 */
export function describePrinterError(error: unknown): DecodeMessage {
  if (error instanceof BluetoothUnavailableError) return { key: 'printer.errorUnavailable' };
  if (error instanceof BluetoothConnectionError) return { key: 'printer.errorConnection' };
  if (error instanceof PrinterNotSupportedError) return { key: 'printer.errorNotSupported' };
  if (error instanceof PrinterDisconnectedError) return { key: 'printer.errorDisconnected' };
  if (error instanceof PrinterBusyError) return { key: 'printer.errorBusy' };
  if (error instanceof PrinterTimeoutError) return { key: 'printer.errorTimeout' };
  if (error instanceof PrinterWriteError) return { key: 'printer.errorWrite' };
  if (error instanceof PrinterProtocolError) return { key: 'printer.errorProtocol' };

  return {
    key: 'printer.errorGeneric',
    values: { message: error instanceof Error ? error.message : String(error) },
  };
}
