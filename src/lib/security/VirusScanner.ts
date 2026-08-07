export interface ScanResult {
  isClean: boolean;
  threatFound?: string;
  scannedAt: Date;
}

export interface VirusScanner {
  /**
   * Scans a file buffer or stream for viruses.
   */
  scanBuffer(buffer: Buffer): Promise<ScanResult>;

  /**
   * Scans an object directly from cloud storage by its path.
   */
  scanStorageObject(path: string): Promise<ScanResult>;
}

/**
 * Raised when a scan cannot be performed. Callers must treat this as "not
 * clean" — it is deliberately not a `ScanResult`, so it cannot be mistaken for
 * a verdict.
 */
export class VirusScanUnavailableError extends Error {
  constructor() {
    super(
      "Virus scanning is not configured. Uploads cannot be accepted until a " +
        "real scanner is wired up (TD-09) — returning them unscanned would " +
        "mark hostile content clean.",
    );
    this.name = "VirusScanUnavailableError";
  }
}

/**
 * Development stand-in for a real scanner.
 *
 * It used to return `{ isClean: true }` unconditionally, in every environment.
 * That is the textbook fail-open: the presence of a scanner in the pipeline
 * makes the upload path *look* defended while every file, including a genuinely
 * malicious one, is stamped clean and passed downstream to be served back to
 * other users of the platform.
 *
 * Outside production it still returns clean, because a local walkthrough must
 * not require a ClamAV daemon. In production it refuses to answer at all. An
 * upload that fails is a support ticket; an upload waved through by a scanner
 * that never scanned is a distribution channel for malware carrying this
 * platform's name on it.
 *
 * TD-09 / readiness checklist 4.7 and 7.9 replace this with a real engine.
 */
export class MockVirusScanner implements VirusScanner {
  private assertUsable(): void {
    if (process.env.NODE_ENV === "production") {
      throw new VirusScanUnavailableError();
    }
  }

  async scanBuffer(_buffer: Buffer): Promise<ScanResult> {
    this.assertUsable();
    return {
      isClean: true,
      scannedAt: new Date(),
    };
  }

  async scanStorageObject(_path: string): Promise<ScanResult> {
    this.assertUsable();
    return {
      isClean: true,
      scannedAt: new Date(),
    };
  }
}

export const virusScanner = new MockVirusScanner();
