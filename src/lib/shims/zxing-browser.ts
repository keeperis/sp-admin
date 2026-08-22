type BrowserQrReaderControls = {
  stop(): void;
};

type BrowserQrResult = {
  getText(): string;
};

type NativeBarcode = {
  rawValue?: string;
};

type NativeBarcodeDetector = {
  detect(source: HTMLVideoElement): Promise<NativeBarcode[]>;
};

type NativeBarcodeDetectorConstructor = new (options?: {
  formats?: string[];
}) => NativeBarcodeDetector;

function createResult(value: string): BrowserQrResult {
  return {
    getText() {
      return value;
    },
  };
}

function resolveBarcodeDetector(): NativeBarcodeDetectorConstructor {
  const detector = (globalThis as { BarcodeDetector?: NativeBarcodeDetectorConstructor })
    .BarcodeDetector;
  if (!detector) {
    throw new Error('BarcodeDetector is not available in this browser');
  }
  return detector;
}

export class BrowserQRCodeReader {
  private readonly delayBetweenScanAttempts: number;

  constructor(
    _hints?: unknown,
    options?: {
      delayBetweenScanAttempts?: number;
    },
  ) {
    this.delayBetweenScanAttempts = Math.max(120, options?.delayBetweenScanAttempts || 250);
  }

  async decodeFromConstraints(
    constraints: MediaStreamConstraints,
    videoElement: HTMLVideoElement,
    callback: (result: BrowserQrResult | null) => void,
  ): Promise<BrowserQrReaderControls> {
    const BarcodeDetector = resolveBarcodeDetector();
    const detector = new BarcodeDetector({ formats: ['qr_code'] });
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    let stopped = false;
    let scanTimer: number | null = null;

    const stop = () => {
      if (stopped) return;
      stopped = true;
      if (scanTimer != null) {
        window.clearTimeout(scanTimer);
        scanTimer = null;
      }
      stream.getTracks().forEach((track) => {
        track.stop();
      });
      if (videoElement.srcObject === stream) {
        videoElement.srcObject = null;
      }
      if (!videoElement.paused) {
        void videoElement.pause();
      }
    };

    const scheduleNextScan = () => {
      if (stopped) return;
      scanTimer = window.setTimeout(() => {
        void scanOnce();
      }, this.delayBetweenScanAttempts);
    };

    const scanOnce = async () => {
      if (stopped) return;
      try {
        const barcodes = await detector.detect(videoElement);
        const match = barcodes.find(
          (barcode) => typeof barcode?.rawValue === 'string' && barcode.rawValue.trim(),
        );
        if (match?.rawValue) {
          callback(createResult(match.rawValue));
          scheduleNextScan();
          return;
        }
      } catch {
        // Keep scanning. The tickets page already has a manual-code fallback.
      }
      scheduleNextScan();
    };

    try {
      videoElement.srcObject = stream;
      await videoElement.play();
    } catch (error) {
      stop();
      throw error;
    }

    scheduleNextScan();

    return { stop };
  }
}
