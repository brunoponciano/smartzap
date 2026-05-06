import "server-only";

import { withStepLogging, type StepInput } from "../step-handler";
import { fetchWithTimeout, safeJson } from "@/lib/server-http";
import { normalizePhoneNumber } from "@/lib/phone-formatter";

type ZApiSendMessageResult =
  | { success: true; data: unknown }
  | { success: false; error: string; details?: unknown };

export type ZApiSendMessageInput = StepInput & {
  instanceId?: string;
  token?: string;
  phone?: string;
  message?: string;
};

export async function zapiSendMessageStep(
  input: ZApiSendMessageInput
): Promise<ZApiSendMessageResult> {
  "use step";

  return withStepLogging(input, async () => {
    const instanceId = String(input.instanceId || "").trim();
    if (!instanceId) {
      return { success: false, error: "instanceId is required" };
    }

    const token = String(input.token || "").trim();
    if (!token) {
      return { success: false, error: "token is required" };
    }

    const rawPhone = String(input.phone || "").trim();
    const phone = normalizePhoneNumber(rawPhone);
    if (!phone || !/^\+\d{8,15}$/.test(phone)) {
      return {
        success: false,
        error: `Phone number is invalid: "${rawPhone}"`,
      };
    }

    const message = String(input.message || "").trim();
    if (!message) {
      return { success: false, error: "message is required" };
    }

    // Z-API expects phone without the leading "+"
    const phoneForApi = phone.replace(/^\+/, "");

    const url = `https://api.z-api.io/instances/${instanceId}/token/${token}/send-text`;

    let res: Response;
    try {
      res = await fetchWithTimeout(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: phoneForApi, message }),
        timeoutMs: 15_000,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Network error";
      return { success: false, error: `Z-API request failed: ${msg}` };
    }

    const body = await safeJson(res);

    if (!res.ok) {
      return {
        success: false,
        error: `Z-API returned HTTP ${res.status}`,
        details: body,
      };
    }

    return { success: true, data: body };
  });
}
zapiSendMessageStep.maxRetries = 0;

export const _integrationType = "zapi";
