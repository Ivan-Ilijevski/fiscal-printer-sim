'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { TiMiniPrinter, bluetoothAvailability, preparePngImage } from 'web-timini-print';
import { Button } from '@/components/ui/button';
import { DecodeMessage } from '@/lib/datamatrix';
import { FEED_STEPS, PRINT_BLACKENING, PRINTER_OPTIONS, describePrinterError } from '@/lib/printer';

/**
 * `checking` exists purely so the server render and the first client render agree. Web
 * Bluetooth availability depends on `navigator` and `isSecureContext`, neither of which exists
 * on the server, so the answer can only be known after mount — asking during render would
 * hydrate one markup and immediately replace it with another.
 */
type PrinterStatus = 'checking' | 'unsupported' | 'idle' | 'connecting' | 'ready' | 'printing';

interface PrinterActionsProps {
  /** Returns the exact PNG the Download button produces, or null if the canvas isn't ready. */
  getPng: () => File | null;
}

/**
 * The Bluetooth strip under the Download/Share row. It owns a *persistent* session: the
 * connection survives between prints, because pairing is the slow, modal part of the flow and
 * the common case is printing the same receipt two or three times in a row.
 */
export default function PrinterActions({ getPng }: PrinterActionsProps) {
  const t = useTranslations();

  // The printer is a live BLE handle, not render data: nothing about it belongs in state, and
  // putting it there would let a stale closure send a job over a session already torn down.
  const printerRef = useRef<TiMiniPrinter | null>(null);
  const unsubscribeRef = useRef<(() => void) | null>(null);

  const [status, setStatus] = useState<PrinterStatus>('checking');
  const [deviceName, setDeviceName] = useState('');
  const [percent, setPercent] = useState(0);
  const [message, setMessage] = useState<DecodeMessage | null>(null);
  const [needsReconnect, setNeedsReconnect] = useState(false);

  useEffect(() => {
    // Returns a reason string when unusable (no Web Bluetooth, insecure context, Firefox /
    // Safari), or undefined when the chooser can actually be opened.
    const reason = bluetoothAvailability();
    setStatus(reason ? 'unsupported' : 'idle');
  }, []);

  // Unmount is the one teardown the user never asks for: a session left open holds the printer
  // against the next tab that wants it. Read through the refs with an empty dep array — the
  // printer must not appear in a dependency list, or every render that changes its identity
  // would drop a working connection.
  useEffect(() => {
    return () => {
      unsubscribeRef.current?.();
      unsubscribeRef.current = null;
      printerRef.current?.disconnect().catch(() => {});
      printerRef.current = null;
    };
  }, []);

  /**
   * Drops the listener and the link together. Both callers — an explicit Disconnect and the
   * mandatory teardown after a failed transfer — need exactly this pair; unsubscribing without
   * disconnecting leaks the GATT link, disconnecting without unsubscribing leaves a callback
   * that rewrites this component's state on behalf of a printer it no longer owns.
   */
  async function releasePrinter(printer: TiMiniPrinter) {
    unsubscribeRef.current?.();
    unsubscribeRef.current = null;
    printerRef.current = null;
    // Best effort. The link is frequently already gone by the time we get here, and a throw
    // would mask the error that sent us here in the first place.
    await printer.disconnect().catch(() => {});
  }

  async function handleConnect() {
    if (status === 'connecting' || status === 'printing') return;

    // These two are synchronous, so the click's user activation is still live at the await
    // below. `requestPrinter` opens Chrome's device chooser and must be the FIRST await in the
    // handler — the same user-gesture constraint that forces `canvasToPngFile` to run
    // synchronously before `navigator.share` over in ReceiptRenderer. Any awaited work ahead
    // of it spends the gesture and the chooser silently never opens.
    setStatus('connecting');
    setMessage(null);
    setNeedsReconnect(false);

    try {
      const printer = await TiMiniPrinter.requestPrinter(PRINTER_OPTIONS);
      await printer.connect();

      // The printer can vanish on its own — out of range, out of paper-cover, powered off —
      // and nothing else would tell us.
      unsubscribeRef.current = printer.onDisconnected(() => {
        unsubscribeRef.current = null;
        printerRef.current = null;
        setStatus('idle');
        setDeviceName('');
        setMessage({ key: 'printer.errorDisconnected' });
      });

      printerRef.current = printer;
      setDeviceName(printer.device.name ?? '');
      setStatus('ready');
    } catch (error) {
      setMessage(describePrinterError(error));
      setStatus('idle');
    }
  }

  async function handlePrint() {
    const printer = printerRef.current;
    if (status !== 'ready' || !printer) return;

    const png = getPng();
    if (!png) return;

    setStatus('printing');
    setPercent(0);
    setMessage(null);
    setNeedsReconnect(false);

    try {
      const { raster } = await preparePngImage(png);
      await printer.printRasterImage(raster, {
        blackening: PRINT_BLACKENING,
        progress: (sent, total) => setPercent(total > 0 ? Math.round((sent / total) * 100) : 0),
      });
      await printer.feed(FEED_STEPS);

      setStatus('ready');
      // Deliberately "sent", not "printed": this promise resolves when the last byte reached
      // the characteristic, which is well before the paper stops moving.
      setMessage({ key: 'printer.transferSent' });
    } catch (error) {
      const failure = describePrinterError(error);

      // Tearing the session down here is the library's documented contract, not a workaround.
      // After any failed transfer it latches an internal `needsReconnect` and refuses every
      // further job until disconnect() + connect(). Auto-retrying would be wrong even if it
      // were allowed: a GATT write that reported failure may still have been delivered, so a
      // blind retry can print the receipt twice. The user reconnects by hand instead.
      await releasePrinter(printer);
      setStatus('idle');
      setDeviceName('');
      setMessage(failure);
      setNeedsReconnect(true);
    }
  }

  async function handleDisconnect() {
    const printer = printerRef.current;
    if (status === 'printing' || !printer) return;

    await releasePrinter(printer);
    setStatus('idle');
    setDeviceName('');
    setMessage(null);
    setNeedsReconnect(false);
  }

  // Nothing to offer before the availability check lands, or on a browser without Web
  // Bluetooth at all — a dead Connect button would only invite a click that cannot work.
  if (status === 'checking' || status === 'unsupported') {
    return (
      <div className="shrink-0 border-t border-rule pt-4">
        <p className="label-mono">{status === 'unsupported' ? t('printer.unsupported') : t('printer.heading')}</p>
      </div>
    );
  }

  const connected = status === 'ready' || status === 'printing';
  // `transferSent` is the only message that is not a failure; everything else in `message`
  // came out of describePrinterError and gets the red ink.
  const isError = message !== null && message.key !== 'printer.transferSent';

  return (
    <div className="flex shrink-0 flex-col gap-2 border-t border-rule pt-4">
      <p className="label-mono">{t('printer.heading')}</p>

      {/* Buttons stretch to the container width on their own — Button owns all its styling and
          call sites pass no className, so width comes from the flex column and the grid. */}
      {connected ? (
        <div className="grid grid-cols-2 gap-2">
          <Button onClick={handlePrint} disabled={status === 'printing'}>
            {t('printer.print')}
          </Button>
          <Button onClick={handleDisconnect} variant="outline" disabled={status === 'printing'}>
            {t('printer.disconnect')}
          </Button>
        </div>
      ) : (
        <Button onClick={handleConnect} disabled={status === 'connecting'}>
          {status === 'connecting' ? t('printer.connecting') : t('printer.connect')}
        </Button>
      )}

      {status === 'printing' && (
        // Progress only starts ticking once the raster is chunked, so the first moment — PNG
        // decode and dithering — reads as "preparing" rather than a stuck 0%.
        <p className="label-mono tabular">{percent > 0 ? t('printer.sending', { percent }) : t('printer.preparing')}</p>
      )}

      {status === 'ready' && <p className="label-mono">{t('printer.connectedTo', { device: deviceName })}</p>}

      {message && (
        <p className={`label-mono ${isError ? 'text-stamp' : 'text-ink-2'}`}>{t(message.key, message.values)}</p>
      )}

      {needsReconnect && <p className="label-mono">{t('printer.reconnectHint')}</p>}
    </div>
  );
}
