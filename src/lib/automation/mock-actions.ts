import {
  getDemoStore,
  logDemoActivity,
  nextDemoId,
  DEMO_USER_ID,
  DEMO_ORG_ID,
} from "@/lib/demo/store";

// The real actions take no organisation parameter any more: the tenant comes
// from the authenticated user, because a caller-supplied one is a cross-tenant
// write. These mocks mirror that signature — src/lib/automation/actions.ts
// derives its parameter list from the real module, so drift here is a type
// error rather than a runtime surprise.
import type {
  createWorkflow as real_createWorkflow,
  publishWorkflowVersion as real_publishWorkflowVersion,
  triggerManualWorkflow as real_triggerManualWorkflow,
  cancelExecutionRun as real_cancelExecutionRun,
  replayDlqItem as real_replayDlqItem,
} from "./real-actions";

export async function createWorkflow(
  name: string,
  description?: string,
  capabilityId?: string,
): Promise<Awaited<ReturnType<typeof real_createWorkflow>>> {
  const store = getDemoStore();
  const newId = nextDemoId(store);

  const workflow = {
    id: newId,
    organizationId: DEMO_ORG_ID,
    name,
    description: description || null,
    status: "draft",
    currentVersionId: null,
    capabilityId: capabilityId || null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };

  store.automationWorkflows.push(workflow);

  logDemoActivity(
    store,
    "automation",
    "create",
    "workflow",
    newId,
    `Created automation workflow: ${name}`,
  );

  return workflow as any;
}

export async function publishWorkflowVersion(
  workflowId: string,
  _rawDefinition: any,
): Promise<Awaited<ReturnType<typeof real_publishWorkflowVersion>>> {
  const store = getDemoStore();
  const versionId = nextDemoId(store);

  const versions = store.automationWorkflowVersions.filter(
    (v) => v.workflowId === workflowId,
  );
  const nextVersionNumber = versions.length + 1;

  const version = {
    id: versionId,
    organizationId: DEMO_ORG_ID,
    workflowId,
    versionNumber: nextVersionNumber,
    executablePlan: {}, // Mock compiled plan
    rulesCompiledAt: new Date(),
    isValid: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };

  store.automationWorkflowVersions.push(version);

  const workflow = store.automationWorkflows.find((w) => w.id === workflowId);
  if (workflow) {
    workflow.currentVersionId = versionId;
    workflow.status = "active";
    workflow.updatedAt = new Date();
  }

  logDemoActivity(
    store,
    "automation",
    "publish_version",
    "workflow_version",
    versionId,
    `Published version ${nextVersionNumber} for workflow ${workflowId}`,
  );

  return version as any;
}

export async function triggerManualWorkflow(
  workflowId: string,
  payload: Record<string, any>,
): Promise<Awaited<ReturnType<typeof real_triggerManualWorkflow>>> {
  const store = getDemoStore();
  const runId = nextDemoId(store);
  const workflow = store.automationWorkflows.find((w) => w.id === workflowId);
  const versionId = workflow?.currentVersionId || nextDemoId(store);

  const idempotencyKey = "manual_" + Date.now();

  const run = {
    id: runId,
    organizationId: DEMO_ORG_ID,
    workflowId,
    versionId,
    status: "queued",
    idempotencyKey,
    triggerSource: "manual_api",
    triggerPayload: payload,
    startedAt: null,
    completedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    createdBy: DEMO_USER_ID,
    updatedBy: DEMO_USER_ID,
    deletedAt: null,
    deletedBy: null,
    isArchived: false,
  };

  store.automationExecutionRuns.push(run);

  logDemoActivity(
    store,
    "automation",
    "trigger",
    "execution_run",
    runId,
    `Triggered execution for workflow ${workflowId}`,
  );

  return run as any;
}

export async function cancelExecutionRun(
  runId: string,
): Promise<Awaited<ReturnType<typeof real_cancelExecutionRun>>> {
  const store = getDemoStore();
  const run = store.automationExecutionRuns.find(
    (r) => r.id === runId && r.organizationId === DEMO_ORG_ID,
  );

  if (run) {
    run.status = "cancelled";
    run.updatedAt = new Date();

    logDemoActivity(
      store,
      "automation",
      "cancel",
      "execution_run",
      runId,
      `Cancelled execution run ${runId}`,
    );
    return run as any;
  }

  throw new Error("Run not found");
}

export async function replayDlqItem(
  dlqId: string,
): Promise<Awaited<ReturnType<typeof real_replayDlqItem>>> {
  const store = getDemoStore();
  const itemIndex = store.automationDeadLetterQueue.findIndex(
    (i) => i.id === dlqId && i.organizationId === DEMO_ORG_ID,
  );

  if (itemIndex === -1) throw new Error("DLQ item not found.");

  const dlqItem = store.automationDeadLetterQueue[itemIndex];
  if (dlqItem.isTerminal) throw new Error("Cannot replay a terminal DLQ item.");

  store.automationDeadLetterQueue.splice(itemIndex, 1);

  logDemoActivity(
    store,
    "automation",
    "replay",
    "dlq_item",
    dlqId,
    `Replayed DLQ item ${dlqId}`,
  );

  return { success: true } as any;
}
