import { NextRequest, NextResponse } from "next/server";
import { contactDb, ContactStatus } from "@/lib/supabase-db";
import { getSupabaseAdmin } from "@/lib/supabase";
import { requireSessionOrApiKey } from "@/lib/request-auth";
import { executeWorkflow } from "@/lib/builder/workflow-executor.workflow";
import { nanoid } from "nanoid";
import { normalizePhoneNumber } from "@/lib/phone-formatter";

export async function POST(request: NextRequest) {
  try {
    const auth = await requireSessionOrApiKey(request);
    if (auth) return auth;

    const body = await request.json();
    const { phone, tag, contactName, contactEmail } = body;

    if (!phone || !tag) {
      return NextResponse.json(
        { error: "Campos 'phone' e 'tag' são obrigatórios." },
        { status: 400 }
      );
    }

    const normalizedPhone = normalizePhoneNumber(phone);
    const tagNormalized = tag.trim();

    // 1. Adiciona a Tag ao Contato (cria o contato se não existir)
    const contact = await contactDb.upsertMergeTagsByPhone(
      {
        phone: normalizedPhone,
        name: contactName || "",
        email: contactEmail || null,
        status: ContactStatus.OPT_IN,
      },
      [tagNormalized]
    );

    const admin = getSupabaseAdmin();
    if (!admin) {
      return NextResponse.json(
        { error: "Supabase admin não configurado." },
        { status: 500 }
      );
    }

    // 2. Busca workflows ativos que tenham o gatilho de Tag para essa tag
    const { data: versions } = await admin
      .from("workflow_versions")
      .select("id, workflow_id, nodes, edges")
      .eq("status", "published");

    const triggeredWorkflows = [];

    for (const version of versions || []) {
      const nodes = version.nodes || [];
      
      const triggerNode = nodes.find(
        (n: any) =>
          n.type === "trigger" &&
          n.data?.config?.triggerType === "Tag" &&
          n.data?.config?.tagName?.trim().toLowerCase() === tagNormalized.toLowerCase()
      );

      if (triggerNode) {
        triggeredWorkflows.push(version);
      }
    }

    const executions = [];

    // 3. Executa os workflows encontrados
    for (const workflow of triggeredWorkflows) {
      const executionId = nanoid();

      await admin.from("workflow_runs").insert({
        id: executionId,
        workflow_id: workflow.workflow_id,
        version_id: workflow.id,
        status: "running",
        trigger_type: "Tag",
        input: { contact, tag: tagNormalized },
        started_at: new Date().toISOString(),
      });

      // Executa de forma assíncrona para não prender o request
      executeWorkflow({
        nodes: workflow.nodes,
        edges: workflow.edges,
        triggerInput: {
          contact,
          tag: tagNormalized,
          source: "add-tag-api"
        },
        executionId,
        workflowId: workflow.workflow_id,
      })
        .then(async (execution) => {
          await admin
            .from("workflow_runs")
            .update({
              status: execution.success ? "success" : "failed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", executionId);
        })
        .catch(async (err) => {
          console.error(`Falha ao executar workflow ${workflow.workflow_id}:`, err);
          await admin
            .from("workflow_runs")
            .update({
              status: "failed",
              completed_at: new Date().toISOString(),
            })
            .eq("id", executionId);
        });

      executions.push({ workflowId: workflow.workflow_id, executionId });
    }

    return NextResponse.json({
      success: true,
      contact: {
        id: contact.id,
        phone: contact.phone,
        tags: contact.tags,
      },
      workflowsTriggered: executions.length,
      executions,
    });
  } catch (error) {
    console.error("Falha na rota add-tag:", error);
    return NextResponse.json(
      { error: "Falha interna ao processar adição de tag." },
      { status: 500 }
    );
  }
}
