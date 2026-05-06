import "server-only";

import { getSupabaseAdmin } from "@/lib/supabase";
import { normalizePhoneNumber } from "@/lib/phone-formatter";
import { sendWhatsAppMessage } from "@/lib/whatsapp-send";
import { Client as QStashClient } from "@upstash/qstash";

function evaluateCondition(
  config: Record<string, unknown>,
  triggerMessage: string,
  contact: Record<string, unknown> | null
): boolean {
  const field = String(config.conditionField || "message_text");
  const operator = String(config.conditionOperator || "contains");
  const value = String(config.conditionValue || "").trim().toLowerCase();

  switch (field) {
    case "message_text": {
      const msg = triggerMessage.toLowerCase();
      if (operator === "contains") return msg.includes(value);
      if (operator === "equals") return msg === value;
      if (operator === "starts_with") return msg.startsWith(value);
      if (operator === "not_contains") return !msg.includes(value);
      return false;
    }
    case "contact_tag": {
      const tags = ((contact?.tags as any[]) || []).map((t: any) =>
        String(typeof t === "object" ? t.name || t : t).toLowerCase()
      );
      if (operator === "has_tag") return tags.some((t) => t.includes(value));
      if (operator === "not_has_tag") return !tags.some((t) => t.includes(value));
      return false;
    }
    case "contact_name": {
      const name = String(contact?.name || "").toLowerCase();
      if (operator === "contains") return name.includes(value);
      if (operator === "equals") return name === value;
      return false;
    }
    default:
      return false;
  }
}

export type WorkflowDirectInput = {
  workflowId: string;
  phone: string;
  triggerMessage?: string;
  triggerInput?: Record<string, unknown>;
};

export async function executeWorkflowDirect({
  workflowId,
  phone,
  triggerMessage = "",
  triggerInput = {},
}: WorkflowDirectInput): Promise<void> {
  const admin = getSupabaseAdmin();
  if (!admin) {
    console.error("[Workflow] supabaseAdmin não configurado");
    return;
  }

  const { data: versions } = await admin
    .from("workflow_versions")
    .select("nodes, edges")
    .eq("workflow_id", workflowId)
    .eq("status", "published")
    .order("published_at", { ascending: false })
    .limit(1);

  const nodes = versions?.[0]?.nodes as any[] | undefined;
  const edges = versions?.[0]?.edges as any[] | undefined;

  if (!nodes || nodes.length === 0) {
    console.error(`[Workflow] Nenhuma versão publicada para workflow ${workflowId}`);
    return;
  }

  const edgeMap = new Map<string, Map<string, string>>();
  const edgeListMap = new Map<string, string[]>();
  for (const edge of edges || []) {
    if (!edgeMap.has(edge.source)) edgeMap.set(edge.source, new Map());
    edgeMap.get(edge.source)!.set(edge.sourceHandle ?? "default", edge.target);
    if (!edgeListMap.has(edge.source)) edgeListMap.set(edge.source, []);
    edgeListMap.get(edge.source)!.push(edge.target);
  }
  const nodeMap = new Map(nodes.map((n: any) => [n.id, n]));

  const phoneVariants = [phone, `+${phone}`, phone.replace(/^55/, "")];
  const { data: matchedContacts } = await admin
    .from("contacts")
    .select("id, name, tags, custom_fields")
    .in("phone", phoneVariants)
    .limit(1);
  const contact =
    matchedContacts?.[0] ||
    (triggerInput.contact as Record<string, unknown> | null) ||
    null;

  const triggerNode = nodes.find((n: any) => n?.data?.type === "trigger");
  if (!triggerNode) {
    console.error("[Workflow] Nó trigger não encontrado");
    return;
  }

  let currentNodeId: string | null = triggerNode.id;
  let depth = 0;
  const MAX_DEPTH = 30;

  console.log(`[Workflow] Iniciando traversal do grafo a partir do trigger`);

  while (currentNodeId && depth < MAX_DEPTH) {
    depth++;
    const node = nodeMap.get(currentNodeId);
    if (!node) break;

    const nodeType = node?.data?.type;
    const config = node?.data?.config || {};
    const actionType = config?.actionType as string | undefined;

    console.log(
      `[Workflow] Processando nó: id=${currentNodeId} type=${nodeType} actionType=${actionType}`
    );

    if (nodeType === "trigger") {
      const nextEdges = edgeMap.get(currentNodeId);
      currentNodeId =
        nextEdges?.get("default") ?? nextEdges?.values().next().value ?? null;
      continue;
    }

    if (nodeType === "action") {
      if (actionType === "Condition") {
        const result = evaluateCondition(config, triggerMessage, contact);
        const branch = result ? "true" : "false";
        const nextEdges = edgeMap.get(currentNodeId);
        const edgeKeys = nextEdges ? Array.from(nextEdges.keys()) : [];
        let targetNodeId: string | null = nextEdges?.get(branch) ?? null;

        if (!targetNodeId) {
          const allTargets = edgeListMap.get(currentNodeId) || [];
          const sortedByY = allTargets
            .map((id) => ({ id, y: nodeMap.get(id)?.position?.y ?? 0 }))
            .sort((a, b) => a.y - b.y);
          if (sortedByY.length >= 2) {
            targetNodeId = result
              ? sortedByY[0].id
              : sortedByY[sortedByY.length - 1].id;
            console.log(
              `[Workflow] Condition branch por posição Y: result=${result} → target=${targetNodeId}`
            );
          } else if (sortedByY.length === 1) {
            targetNodeId = sortedByY[0].id;
          }
        }

        console.log(
          `[Workflow] Condição avaliada: ${result} → branch "${branch}" | edges: [${edgeKeys.join(", ")}] → next=${targetNodeId}`
        );
        currentNodeId = targetNodeId;
        continue;
      }

      if (
        actionType === "WhatsApp Message" ||
        actionType === "whatsapp/send-message"
      ) {
        const messageText = String(
          config.messageText || config.message || ""
        ).trim();
        if (messageText) {
          try {
            await sendWhatsAppMessage({ to: phone, type: "text", text: messageText });
          } catch (err) {
            console.error("[Workflow] Erro ao enviar mensagem:", err);
          }
        }
      } else if (
        actionType === "Add Tag" ||
        actionType === "Remove Tag" ||
        actionType === "manage-tag"
      ) {
        const tagName = String(config.tagName || config.tag || "").trim();
        const isRemove =
          actionType === "Remove Tag" ||
          (actionType === "manage-tag" &&
            String(config.action || "").toLowerCase().includes("remov"));

        if (tagName && contact?.id) {
          const tagsToAdd = isRemove ? [] : [tagName];
          const tagsToRemove = isRemove ? [tagName] : [];
          const { error } = await admin.rpc("bulk_update_contact_tags", {
            p_ids: [contact.id],
            p_tags_to_add: tagsToAdd,
            p_tags_to_remove: tagsToRemove,
          });
          if (error)
            console.error(`[Workflow] Erro ao aplicar tag "${tagName}":`, error);
        } else if (!contact?.id) {
          console.warn(
            `[Workflow] Contato não encontrado para telefone ${phone}`
          );
        }
      } else if (actionType === "zapi/send-message") {
        const targetPhone = String(config.phone || phone || "").trim();
        try {
          const { sendZapiMessage } = await import(
            "@/lib/builder/steps/zapi/send-message"
          );
          const result = await sendZapiMessage({
            instanceId: String(config.instanceId || ""),
            token: String(config.token || ""),
            phone: targetPhone,
            message: String(config.message || ""),
          });
          if (!result.success) {
            console.error(
              "[Workflow] Z-API falhou:",
              result.error,
              result.details
            );
          }
        } catch (err) {
          console.error("[Workflow] Erro ao chamar Z-API:", err);
        }
      } else if (actionType === "Delay") {
        const amount = Number(config.delayAmount ?? 5);
        const unit = String(config.delayUnit ?? "minutes");
        const seconds =
          unit === "days"
            ? amount * 86400
            : unit === "hours"
            ? amount * 3600
            : amount * 60;

        const nextEdges = edgeMap.get(currentNodeId);
        const nextNodeId =
          nextEdges?.get("default") ?? nextEdges?.values().next().value ?? null;

        if (nextNodeId) {
          const { nanoid } = await import("nanoid");
          const conversationId = nanoid();

          await admin.from("workflow_conversations").insert({
            id: conversationId,
            workflow_id: workflowId,
            phone: normalizePhoneNumber(phone) || phone,
            status: "waiting",
            resume_node_id: nextNodeId,
            variable_key: null,
            variables: {
              __triggerInput: {
                from: phone,
                message: triggerMessage,
                ...triggerInput,
              },
            },
            pause_type: "delay",
          });

          const vercelEnv = process.env.VERCEL_ENV ?? "";
          const productionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
            ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
            : null;
          const vercelUrl = process.env.VERCEL_URL
            ? `https://${process.env.VERCEL_URL}`
            : null;
          const explicitAppUrl = process.env.NEXT_PUBLIC_APP_URL ?? null;
          const baseUrl =
            vercelEnv === "production"
              ? explicitAppUrl || productionUrl || vercelUrl || "http://localhost:3000"
              : explicitAppUrl || vercelUrl || productionUrl || "http://localhost:3000";

          const qstashClient = new QStashClient({
            token: process.env.QSTASH_TOKEN ?? "",
          });
          const bypassHeaders: Record<string, string> = {};
          if (process.env.VERCEL_AUTOMATION_BYPASS_SECRET) {
            bypassHeaders["x-vercel-protection-bypass"] =
              process.env.VERCEL_AUTOMATION_BYPASS_SECRET;
          }
          await qstashClient.publishJSON({
            url: `${baseUrl}/api/builder/workflow/${workflowId}/delay-resume`,
            body: { workflowId, conversationId },
            delay: seconds,
            retries: 3,
            headers: bypassHeaders,
          });

          console.log(
            `[Workflow] Delay de ${amount} ${unit} (${seconds}s) agendado. conversationId=${conversationId}`
          );
        }

        break;
      }

      const nextEdges = edgeMap.get(currentNodeId);
      currentNodeId =
        nextEdges?.get("default") ?? nextEdges?.values().next().value ?? null;
      continue;
    }

    const nextEdges = edgeMap.get(currentNodeId);
    currentNodeId =
      nextEdges?.get("default") ?? nextEdges?.values().next().value ?? null;
  }

  console.log(`[Workflow] Traversal concluído em ${depth} etapas`);
}
