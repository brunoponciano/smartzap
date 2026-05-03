import "server-only";

import { withStepLogging, type StepInput } from "./step-handler";
import { sendWhatsAppMessage } from "@/lib/whatsapp-send";
import { getSupabaseAdmin } from "@/lib/supabase";

type ActionResult =
  | { success: true; data?: unknown }
  | { success: false; error: string; details?: unknown };

export type WhatsAppMessageInput = StepInput & {
  messageText?: string;
  message?: string;
  triggerData?: Record<string, unknown>;
};

export type ManageTagInput = StepInput & {
  tagName?: string;
  actionType?: string;
  triggerData?: Record<string, unknown>;
};

function resolveRecipient(triggerData?: Record<string, unknown>): string | null {
  if (!triggerData) return null;
  // O gatilho do webhook repassa 'from'
  const from = triggerData.from as string;
  if (from) return from;
  const contact = triggerData.contact as { phone?: string };
  if (contact?.phone) return contact.phone;
  return null;
}

export async function whatsAppMessageStep(
  input: WhatsAppMessageInput
): Promise<ActionResult> {
  "use step";

  return withStepLogging(input, async () => {
    const to = resolveRecipient(input.triggerData);
    if (!to) {
      return { success: false, error: "Destinatario não encontrado (não veio do WhatsApp)." };
    }

    const message = String(input.messageText || input.message || "").trim();
    if (!message) {
      return { success: false, error: "A mensagem está vazia." };
    }

    try {
      const result = await sendWhatsAppMessage({
        to,
        type: "text",
        text: message,
      });

      if (!result.success) {
        return { success: false, error: "Falha ao enviar mensagem pela Meta API", details: result.error };
      }

      return { success: true, data: { messageId: result.messageId } };
    } catch (err: any) {
      return { success: false, error: err.message || "Erro desconhecido ao enviar mensagem" };
    }
  });
}
whatsAppMessageStep.maxRetries = 0;


export async function manageTagStep(
  input: ManageTagInput
): Promise<ActionResult> {
  "use step";

  return withStepLogging(input, async () => {
    const phone = resolveRecipient(input.triggerData);
    if (!phone) {
      return { success: false, error: "Contato não identificado (não veio do WhatsApp)." };
    }

    const tagName = String(input.tagName || "").trim();
    if (!tagName) {
      return { success: false, error: "O nome da Tag está vazio." };
    }

    const isRemove = input._context?.nodeName === "Remove Tag" || input.actionType === "Remove Tag";
    
    try {
      const supabaseAdmin = getSupabaseAdmin();
      if (!supabaseAdmin) {
        return { success: false, error: "Banco de dados não configurado." };
      }

      // Primeiro, acha o contato pelo telefone
      const { data: contacts, error: contactError } = await supabaseAdmin
        .from("contacts")
        .select("id, company_id")
        .eq("phone", phone);

      if (contactError || !contacts || contacts.length === 0) {
        return { success: false, error: "Contato não encontrado no CRM." };
      }

      const contactId = contacts[0].id;

      // Se achar, usa o RPC apply_auto_reply_tags para ser seguro
      const tagsToAdd = isRemove ? [] : [tagName];
      const tagsToRemove = isRemove ? [tagName] : [];

      const { error: rpcError } = await supabaseAdmin.rpc("apply_auto_reply_tags", {
        p_contact_ids: [contactId],
        p_tags_to_add: tagsToAdd,
        p_tags_to_remove: tagsToRemove,
      });

      if (rpcError) {
        return { success: false, error: "Erro ao aplicar tag no banco", details: rpcError };
      }

      return { success: true, data: { contactId, appliedTag: tagName, action: isRemove ? "removed" : "added" } };
    } catch (err: any) {
      return { success: false, error: err.message || "Erro desconhecido ao gerenciar tag" };
    }
  });
}
manageTagStep.maxRetries = 0;
