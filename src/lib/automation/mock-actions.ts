/* eslint-disable @typescript-eslint/no-explicit-any */
import type { createWorkflow as real_createWorkflow, publishWorkflowVersion as real_publishWorkflowVersion, triggerManualWorkflow as real_triggerManualWorkflow, cancelExecutionRun as real_cancelExecutionRun, replayDlqItem as real_replayDlqItem } from "./real-actions";

export async function createWorkflow(...args: Parameters<typeof real_createWorkflow>): Promise<Awaited<ReturnType<typeof real_createWorkflow>>> {
  return { id: "mock-id", success: true } as any;
}

export async function publishWorkflowVersion(...args: Parameters<typeof real_publishWorkflowVersion>): Promise<Awaited<ReturnType<typeof real_publishWorkflowVersion>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function triggerManualWorkflow(...args: Parameters<typeof real_triggerManualWorkflow>): Promise<Awaited<ReturnType<typeof real_triggerManualWorkflow>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function cancelExecutionRun(...args: Parameters<typeof real_cancelExecutionRun>): Promise<Awaited<ReturnType<typeof real_cancelExecutionRun>>> {
  return { id: "mock-id", data: [] } as any;
}

export async function replayDlqItem(...args: Parameters<typeof real_replayDlqItem>): Promise<Awaited<ReturnType<typeof real_replayDlqItem>>> {
  return { id: "mock-id", data: [] } as any;
}
