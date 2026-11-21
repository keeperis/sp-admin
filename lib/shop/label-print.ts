import type { FulfillmentStatus } from './commerce-contract';

export function canPrintDpdLabel(status: FulfillmentStatus) {
  return status === 'unfulfilled' || status === 'preparing';
}

/** Open immediately from a user click, before requesting the cached A6 PDF. */
export function openLabelPrintWindow() {
  const target = window.open('', '_blank');
  if (!target) return null;
  target.opener = null;
  target.document.title = 'DPD etiketė · A6';
  target.document.body.textContent = 'Ruošiama DPD A6 etiketė…';
  return target;
}

export function showLabelPdf(
  target: Window | null,
  label: { base64: string; contentType: string; filename: string },
) {
  const bytes = Uint8Array.from(atob(label.base64), (character) => character.charCodeAt(0));
  const url = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }));
  if (!target || target.closed) {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = label.filename;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    return;
  }
  target.document.body.replaceChildren();
  target.document.body.style.cssText = 'margin:0;background:#f4f4f4;font:14px system-ui';
  const bar = target.document.createElement('div');
  bar.style.cssText = 'padding:12px;display:flex;gap:16px;align-items:center';
  const button = target.document.createElement('button');
  button.textContent = 'Spausdinti A6 etiketę';
  const download = target.document.createElement('a');
  download.href = url;
  download.download = label.filename;
  download.textContent = 'Atsisiųsti PDF';
  bar.append(button, download);
  const frame = target.document.createElement('iframe');
  frame.title = 'DPD A6 etiketė';
  frame.style.cssText = 'width:100%;height:calc(100vh - 58px);border:0';
  const print = () => {
    try {
      frame.contentWindow?.focus();
      frame.contentWindow?.print();
    } catch {
      /* PDF viewer keeps its own print control. */
    }
  };
  button.addEventListener('click', print);
  frame.addEventListener('load', () => target.setTimeout(print, 600), { once: true });
  frame.src = url;
  target.document.body.append(bar, frame);
  target.addEventListener('beforeunload', () => URL.revokeObjectURL(url), { once: true });
}
