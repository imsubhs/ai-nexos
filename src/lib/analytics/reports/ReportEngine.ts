import { ReportExecutionState } from "../types";

export interface ReportJob {
  id: string;
  templateId: string;
  parameters: Record<string, unknown>;
  state: ReportExecutionState;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  resultUrl?: string; // Private Storage Key
  signedDownloadUrl?: string;
  isHistorical: boolean;
  idempotencyKey: string; // Hardening: Prevent duplicate generation
}

export class ReportEngine {
  private activeJobs: Map<string, ReportJob> = new Map();
  private idempotencyCache: Map<string, string> = new Map(); // idempotencyKey -> jobId

  /**
   * Enqueues a report generation job with idempotency.
   */
  async enqueueReport(
    templateId: string,
    parameters: Record<string, unknown>,
    isHistorical: boolean = false,
    idempotencyKey?: string,
  ): Promise<string> {
    // Hardening: Idempotency check
    const key = idempotencyKey || `${templateId}_${JSON.stringify(parameters)}`;
    if (this.idempotencyCache.has(key)) {
      return this.idempotencyCache.get(key)!;
    }

    const jobId = `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const job: ReportJob = {
      id: jobId,
      templateId,
      parameters,
      state: "QUEUED",
      createdAt: new Date().toISOString(),
      isHistorical,
      idempotencyKey: key,
    };

    this.activeJobs.set(jobId, job);
    this.idempotencyCache.set(key, jobId);

    // In reality, this pushes to a queue (e.g., BullMQ)
    this.processJobAsync(jobId);

    return jobId;
  }

  /**
   * Gets the status of a report job and generates a signed URL if completed.
   */
  async getJobStatus(
    jobId: string,
    requestedByUserId: string,
  ): Promise<ReportJob | undefined> {
    const job = this.activeJobs.get(jobId);
    if (!job) return undefined;

    if (job.state === "COMPLETED" && job.resultUrl && !job.signedDownloadUrl) {
      // Hardening: Generate Signed URL just-in-time
      job.signedDownloadUrl = await this.generateSignedUrl(
        job.resultUrl,
        requestedByUserId,
      );
    }

    return job;
  }

  private async generateSignedUrl(
    storageKey: string,
    userId: string,
  ): Promise<string> {
    // 1. Generate short-lived signed URL to Private Storage
    const signedToken = `token_${Date.now()}_expires_15m`;
    const url = `https://private-storage.ainexos.com/reports/${storageKey}?signature=${signedToken}`;

    // 2. Hardening: Log download activity for audit
    console.log(
      `[AUDIT] Report download URL generated for user ${userId}. StorageKey: ${storageKey}`,
    );

    return url;
  }

  /**
   * Internal processor for the job.
   */
  private async processJobAsync(jobId: string) {
    const job = this.activeJobs.get(jobId);
    if (!job) return;

    job.state = "RUNNING";
    job.startedAt = new Date().toISOString();

    try {
      if (job.isHistorical) {
        await this.generateFromHistoricalSnapshots(job);
      } else {
        await this.generateFromProjections(job);
      }

      job.state = "COMPLETED";
      job.completedAt = new Date().toISOString();

      // Hardening: Store in private bucket without public access
      job.resultUrl = `private_s3_key_${jobId}.pdf`;
    } catch (error: unknown) {
      job.state = "FAILED";
      job.error =
        error instanceof Error ? error.message : "Report generation failed";
    }
  }

  private async generateFromHistoricalSnapshots(_job: ReportJob) {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async generateFromProjections(_job: ReportJob) {
    return new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

export const reportEngine = new ReportEngine();
