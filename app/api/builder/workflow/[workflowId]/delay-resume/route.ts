import { NextRequest, NextResponse } from "next/server";
import { Receiver } from "@upstash/qstash";
import { nanoid } from "nanoid";
import { getSupabaseAdmin } from "@/lib/supabase";
import {
  ensureWorkflowRecord,
  getCompanyId,
  toSavedWorkflow,
} from "@/lib/builder/workflow-db";
import { executeWorkflow } from "@/lib/builder/workflow-executor.workflow";
import { validateWorkflowSchema } from "@/lib/shared/workflow-schema";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ workflowId: string }> }
) {
  const body = await request.text();

  // Verifica assinatura do QStash
  const receiver = new Receiver({
    currentSigningKey: process.env.QSTASH_CURRENT_SIGNING_KEY ?? "",
    nextSigningKey: process.env.QSTASH_NEXT_SIGNING_KEY ?? "",
  });

  const isValid = await receiver
    .verify({ signature: request.headers.get("upstash-signature") ?? "", body })
    .catch(() => false);

  if (!isValid) {
    console.error("[DelayResume] Assinatura QStash inválida");
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { workflowId: bodyWorkflowId, conversationId } = JSON.parse(body) as {
    workflowId: string;
    conversationId: string;
  };

  const { workflowId: paramWorkflowId } = await params;
  const workflowId = bodyWorkflowId || paramWorkflowId;

  if (!workflowId || !conversationId) {
    return NextResponse.json(
      { error: "Missing workflowId or conversationId" },
      { status: 400 }
    );
  }

  const supabase = getSupabaseAdmin();
  if (!supabase) {
    return NextResponse.json(
      { error: "Supabase not configured" },
      { status: 500 }
    );
  }

  // Busca a conversa pausada pelo delay
  const { data: conversation } = await supabase
    .from("workflow_conversations")
    .select("*")
    .eq("id", conversationId)
    .eq("status", "waiting")
    .eq("pause_type", "delay")
    .maybeSingle();

  if (!conversation) {
    console.warn(`[DelayResume] Conversa ${conversationId} não encontrada ou já retomada`);
    return NextResponse.json({ status: "skipped" });
  }

  // Marca como completa imediatamente para evitar dupla execução
  await supabase
    .from("workflow_conversations")
    .update({ status: "completed" })
    .eq("id", conversationId);

  const companyId = await getCompanyId(supabase);
  const record = await ensureWorkflowRecord(supabase, workflowId, companyId);
  const workflow = toSavedWorkflow(record);
  const validation = validateWorkflowSchema(workflow);

  if (!validation.success) {
    console.error("[DelayResume] Workflow inválido:", validation.errors);
    return NextResponse.json({ error: "Invalid workflow" }, { status: 400 });
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

  console.log(`[DelayResume] Retomando workflow ${workflowId} a partir do nó ${conversation.resume_node_id}`);

  executeWorkflow({
    nodes: workflow.nodes,
    edges: workflow.edges,
    triggerInput: savedTriggerInput,
    executionId,
    workflowId,
    startNodeIds: [conversation.resume_node_id],
    initialVariables: savedVars,
  })
    .then(async (execution) => {
      await supabase
        .from("workflow_runs")
        .update({
          status: execution.success ? "success" : "failed",
          finished_at: new Date().toISOString(),
        })
        .eq("id", executionId);
      console.log(`[DelayResume] Execução ${executionId} concluída: ${execution.success ? "success" : "failed"}`);
    })
    .catch(async (err) => {
      console.error(`[DelayResume] Erro na execução ${executionId}:`, err);
      await supabase
        .from("workflow_runs")
        .update({ status: "failed", finished_at: new Date().toISOString() })
        .eq("id", executionId);
    });

  // Responde imediatamente ao QStash (não bloqueia)
  return NextResponse.json({ status: "accepted", executionId });
}
