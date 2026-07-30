import {
  AnalyticsScope,
  ExportFormat,
  ExportPolicy,
  ExportJob,
} from "../types";

export class ExportService {
  /**
   * Orchestrates the export flow:
   * Permission -> Analytics Scope -> Export Policy -> Signed Download -> Audit Event
   */
  async requestExport(
    userId: string,
    scope: AnalyticsScope,
    format: ExportFormat,
    dataQueryPayload: unknown,
  ): Promise<ExportJob> {
    // 1. Permission Check
    const hasPermission = await this.checkExportPermissions(userId, scope);
    if (!hasPermission) {
      throw new Error(
        "User does not have permission to export data in this scope.",
      );
    }

    // 2. Validate Analytics Scope
    this.validateScope(scope);

    // 3. Apply Export Policy
    const policy = this.getExportPolicy(format, scope);
    if (!policy.allowedFormats.includes(format)) {
      throw new Error(`Format ${format} is not allowed by policy.`);
    }

    // Create the Job
    const job: ExportJob = {
      id: `export_${Date.now()}`,
      requestedBy: userId,
      scope,
      format,
      status: "QUEUED",
      policyApplied: policy,
      expiresAt: new Date(
        Date.now() + policy.retentionDays * 86400000,
      ).toISOString(),
      createdAt: new Date().toISOString(),
    };

    // Trigger async execution
    this.executeExport(job, dataQueryPayload).catch(console.error);

    return job;
  }

  private async executeExport(job: ExportJob, dataQueryPayload: unknown) {
    job.status = "RUNNING";

    try {
      // Hardening: Streaming Export using Cursors
      // We simulate streaming chunks to avoid loading 100k+ rows into memory.
      await this.streamDataToStorage(job, dataQueryPayload);

      // 4. Generate Signed Download
      job.downloadUrl = `https://downloads.ainexos.com/signed/${job.id}?token=abc123_expires_${job.expiresAt}`;
      job.status = "COMPLETED";

      // 5. Emit Audit Event
      this.emitAuditEvent(job);
    } catch (error) {
      console.error(`Export failed for job ${job.id}:`, error);
      job.status = "FAILED";
    }
  }

  /**
   * Simulates a database cursor streaming data directly to object storage.
   */
  private async streamDataToStorage(
    job: ExportJob,
    _payload: unknown,
  ): Promise<void> {
    console.log(
      `[STREAM] Opening database cursor for query for job ${job.id}...`,
    );
    const cursorBatchSize = 1000;
    let rowsProcessed = 0;

    // Simulate paginated fetching and writing
    while (rowsProcessed < Math.min(10000, job.policyApplied.maxRows)) {
      // Fetch batch via cursor (simulated)
      await new Promise((resolve) => setTimeout(resolve, 50));

      // Write batch to storage stream (simulated)
      rowsProcessed += cursorBatchSize;
      console.log(`[STREAM] Wrote ${rowsProcessed} rows to storage buffer...`);
    }

    console.log(`[STREAM] Upload complete. Total rows: ${rowsProcessed}`);
  }

  private async checkExportPermissions(
    _userId: string,
    _scope: AnalyticsScope,
  ): Promise<boolean> {
    return true;
  }

  private validateScope(scope: AnalyticsScope): void {
    if (!scope.organizationId) {
      throw new Error("Organization ID is required for export scoping.");
    }
  }

  private getExportPolicy(
    format: ExportFormat,
    _scope: AnalyticsScope,
  ): ExportPolicy {
    return {
      maxRows: format === "CSV" ? 100000 : 10000,
      allowedFormats: ["CSV", "EXCEL", "PDF", "JSON"],
      requiresWatermark: format === "PDF",
      retentionDays: 7,
    };
  }

  private emitAuditEvent(job: ExportJob): void {
    // Emit to Event Store / Append-Only Audit Log
    console.log(
      `[AUDIT] Export completed for user ${job.requestedBy}. Job ID: ${job.id}. Format: ${job.format}`,
    );
  }
}

export const exportService = new ExportService();
