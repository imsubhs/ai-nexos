"use server";

import * as real from "./real-actions";
import * as mock from "./mock-actions";

export async function createWorkflow(
  ...args: Parameters<typeof real.createWorkflow>
): Promise<Awaited<ReturnType<typeof real.createWorkflow>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).createWorkflow(...args);
  return (real as any).createWorkflow(...args);
}

export async function publishWorkflowVersion(
  ...args: Parameters<typeof real.publishWorkflowVersion>
): Promise<Awaited<ReturnType<typeof real.publishWorkflowVersion>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).publishWorkflowVersion(...args);
  return (real as any).publishWorkflowVersion(...args);
}

export async function triggerManualWorkflow(
  ...args: Parameters<typeof real.triggerManualWorkflow>
): Promise<Awaited<ReturnType<typeof real.triggerManualWorkflow>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).triggerManualWorkflow(...args);
  return (real as any).triggerManualWorkflow(...args);
}

export async function cancelExecutionRun(
  ...args: Parameters<typeof real.cancelExecutionRun>
): Promise<Awaited<ReturnType<typeof real.cancelExecutionRun>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).cancelExecutionRun(...args);
  return (real as any).cancelExecutionRun(...args);
}

export async function replayDlqItem(
  ...args: Parameters<typeof real.replayDlqItem>
): Promise<Awaited<ReturnType<typeof real.replayDlqItem>>> {
  if (process.env.DEMO_MODE === "true")
    return (mock as any).replayDlqItem(...args);
  return (real as any).replayDlqItem(...args);
}
