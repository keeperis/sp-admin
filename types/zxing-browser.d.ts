declare module '@zxing/browser' {
  export type BrowserQrReaderControls = {
    stop(): void;
  };

  export class BrowserQRCodeReader {
    constructor(
      hints?: unknown,
      options?: {
        delayBetweenScanAttempts?: number;
      },
    );

    decodeFromConstraints(
      constraints: MediaStreamConstraints,
      videoElement: HTMLVideoElement,
      callback: (result: { getText(): string } | null) => void,
    ): Promise<BrowserQrReaderControls>;
  }
}
