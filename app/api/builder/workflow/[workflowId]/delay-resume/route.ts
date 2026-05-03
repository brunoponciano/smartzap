import { serve } from "@upstash/workflow/nextjs";
import { nanoid } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  ensureWorkflowRecord,
  getCompanyId,
  toSavedWorkflow,
} from "@/lib/builder/workflow-db";
import { executeWorkflow } from "@/lib/builder/workflow-executor.workflow";
import { validateWorkflowSchema } from "@/lib/shared/workflow-schema";
import { completeConversation } from "@/lib/builder/workflow-conversations";

type DelayResumeInput = {
  workflowId: string;
  conversationId: string;
};

export const { POST } = serve<DelayResumeInput>(async (context) => {
  const { workflowId, conversationId } = context.requestPayload;

  if (!workflowId || !conversationId) {
    return { status: "failed", error: "Missing workflowId or conversationId" };
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return { status: "failed", error: "Supabase not configured" };
  }

  const { data: conversation } = await supabase
    .from("workflow_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("status", "waiting")
    .eq("pause_type", "delay")
    .maybeSingle();

  if (!conversation) {
    return {
      status: "skipped",
      reason: "conversation_not_found_or_already_resumed",
    };
  }

  const companyId = await getCompanyId(supabase);
  const record = await ensureWorkflowRecord(supabase, workflowId, companyId);
  const workflow = toSavedWorkflow(record);
  const validation = validateWorkflowSchema(workflow);
  if (!validation.success) {
    return { status: "failed", error: "Invalid workflow" };
  }

  const executionId = nanoid();
  await supabase.from("workflow_runs").insert({
    id: executionId,
    workflow_id: workflowId,
    version_id: record.workflow.active_version_id,
    status: "running",
    trigger_type: "DelayResume",
    input: {},
    started_at: new Date().toISOString(),
  });

  const savedVars =
    (conversation.variables as Record<string, unknown> | null) ?? {};
  const savedTriggerInput =
    (savedVars.__triggerInput as Record<string, unknown>) ?? {};

  const execution = await context.run(
    `delay-resume-${workflowId}-${conversationId}`,
    () =>
      executeWorkflow({
        nodes: workflow.nodes,
        edges: workflow.edges,
        triggerInput: savedTriggerInput,
        executionId,
        workflowId,
        startNodeIds: [conversation.resume_node_id],
        initialVariables: savedVars,
      })
  );

  await completeConversation(supabase, conversation.id, savedVars);

  await supabase
    .from("workflow_runs")
    .update({
      status: execution.success ? "success" : "failed",
      finished_at: new Date().toISOString(),
    })
    .eq("id", executionId);

  return { status: execution.success ? "success" : "failed" };
});
