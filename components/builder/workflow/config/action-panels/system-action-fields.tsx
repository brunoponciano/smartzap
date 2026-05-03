"use client";

import { CodeEditor } from "@/components/builder/ui/code-editor";
import { Input } from "@/components/builder/ui/input";
import { Label } from "@/components/builder/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/builder/ui/select";
import { TemplateBadgeInput } from "@/components/builder/ui/template-badge-input";
import { SchemaBuilder, type SchemaField } from "../schema-builder";

export interface SystemActionFieldsProps {
  actionType: string;
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}

// WhatsApp Message fields component
function WhatsAppMessageFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="messageText">Texto da Mensagem</Label>
      <div className="overflow-hidden rounded-md border">
        <CodeEditor
          defaultLanguage="markdown"
          height="150px"
          onChange={(value) => onUpdateConfig("messageText", value || "")}
          options={{
            minimap: { enabled: false },
            lineNumbers: "off",
            scrollBeyondLastLine: false,
            fontSize: 14,
            readOnly: disabled,
            wordWrap: "on",
          }}
          value={(config?.messageText as string) || ""}
        />
      </div>
      <p className="text-muted-foreground text-xs">
        Escreva a mensagem que o cliente vai receber. Voce pode usar variaveis usando chaves duplas: {"{{nome}}"}.
      </p>
    </div>
  );
}

// Tag fields component
function TagFields({
  config,
  onUpdateConfig,
  disabled,
  mode,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
  mode: "add" | "remove";
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="tagName">Nome da Tag</Label>
      <Input
        disabled={disabled}
        id="tagName"
        onChange={(e) => onUpdateConfig("tagName", e.target.value)}
        placeholder="Ex: cliente_vip"
        value={(config?.tagName as string) || ""}
      />
      <p className="text-muted-foreground text-xs">
        {mode === "add"
          ? "Esta tag sera aplicada ao contato atual quando o fluxo passar por aqui."
          : "Esta tag sera removida do contato atual quando o fluxo passar por aqui."}
      </p>
    </div>
  );
}

// Database Query fields component
function DatabaseQueryFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
      <Label htmlFor="dbQuery">Consulta SQL</Label>
        <div className="overflow-hidden rounded-md border">
          <CodeEditor
            defaultLanguage="sql"
            height="150px"
            onChange={(value) => onUpdateConfig("dbQuery", value || "")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "on",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: disabled,
              wordWrap: "off",
            }}
            value={(config?.dbQuery as string) || ""}
          />
        </div>
        <p className="text-muted-foreground text-xs">
          A DATABASE_URL das integrações do projeto sera usada para executar
          essa consulta.
        </p>
      </div>
      <div className="space-y-2">
      <Label>Schema (opcional)</Label>
        <SchemaBuilder
          disabled={disabled}
          onChange={(schema) =>
            onUpdateConfig("dbSchema", JSON.stringify(schema))
          }
          schema={
            config?.dbSchema
              ? (JSON.parse(config.dbSchema as string) as SchemaField[])
              : []
          }
        />
      </div>
    </>
  );
}

// HTTP Request fields component
function HttpRequestFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <>
      <div className="space-y-2">
      <Label htmlFor="httpMethod">Metodo HTTP</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("httpMethod", value)}
          value={(config?.httpMethod as string) || "POST"}
        >
          <SelectTrigger className="w-full" id="httpMethod">
            <SelectValue placeholder="Selecione o metodo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="GET">GET</SelectItem>
            <SelectItem value="POST">POST</SelectItem>
            <SelectItem value="PUT">PUT</SelectItem>
            <SelectItem value="PATCH">PATCH</SelectItem>
            <SelectItem value="DELETE">DELETE</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-2">
      <Label htmlFor="endpoint">URL</Label>
        <TemplateBadgeInput
          disabled={disabled}
          id="endpoint"
          onChange={(value) => onUpdateConfig("endpoint", value)}
          placeholder="https://api.example.com/endpoint or {{NodeName.url}}"
          value={(config?.endpoint as string) || ""}
        />
      </div>
      <div className="space-y-2">
      <Label htmlFor="httpHeaders">Cabecalhos (JSON)</Label>
        <div className="overflow-hidden rounded-md border">
          <CodeEditor
            defaultLanguage="json"
            height="100px"
            onChange={(value) => onUpdateConfig("httpHeaders", value || "{}")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: disabled,
              wordWrap: "off",
            }}
            value={(config?.httpHeaders as string) || "{}"}
          />
        </div>
      </div>
      <div className="space-y-2">
      <Label htmlFor="httpBody">Corpo (JSON)</Label>
        <div
          className={`overflow-hidden rounded-md border ${config?.httpMethod === "GET" ? "opacity-50" : ""}`}
        >
          <CodeEditor
            defaultLanguage="json"
            height="120px"
            onChange={(value) => onUpdateConfig("httpBody", value || "{}")}
            options={{
              minimap: { enabled: false },
              lineNumbers: "off",
              scrollBeyondLastLine: false,
              fontSize: 12,
              readOnly: config?.httpMethod === "GET" || disabled,
              domReadOnly: config?.httpMethod === "GET" || disabled,
              wordWrap: "off",
            }}
            value={(config?.httpBody as string) || "{}"}
          />
        </div>
        {config?.httpMethod === "GET" && (
          <p className="text-muted-foreground text-xs">
            Body desativado para requisicoes GET
          </p>
        )}
      </div>
    </>
  );
}

// Condition fields component
function ConditionFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  const conditionField = (config?.conditionField as string) || "message_text";
  const conditionOperator = (config?.conditionOperator as string) || "contains";

  const operatorsByField: Record<string, { value: string; label: string }[]> = {
    message_text: [
      { value: "contains", label: "contém" },
      { value: "equals", label: "é igual a" },
      { value: "starts_with", label: "começa com" },
      { value: "not_contains", label: "não contém" },
    ],
    contact_tag: [
      { value: "has_tag", label: "tem a tag" },
      { value: "not_has_tag", label: "não tem a tag" },
    ],
    contact_name: [
      { value: "contains", label: "contém" },
      { value: "equals", label: "é igual a" },
    ],
  };

  const operators = operatorsByField[conditionField] || operatorsByField.message_text;

  return (
    <div className="space-y-3">
      {/* Instrução */}
      <div className="rounded-md border border-dashed border-pink-400/50 bg-pink-500/10 p-3">
        <p className="text-xs text-pink-300">
          Configure a condição. A saída <strong>Sim ✓</strong> é ativada quando verdadeiro, <strong>Não ✗</strong> quando falso.
        </p>
      </div>

      {/* Campo */}
      <div className="space-y-1">
        <Label htmlFor="conditionField">Verificar</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("conditionField", value)}
          value={conditionField}
        >
          <SelectTrigger id="conditionField">
            <SelectValue placeholder="Selecione o campo" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="message_text">Texto da mensagem recebida</SelectItem>
            <SelectItem value="contact_tag">Tag do contato</SelectItem>
            <SelectItem value="contact_name">Nome do contato</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Operador */}
      <div className="space-y-1">
        <Label htmlFor="conditionOperator">Condição</Label>
        <Select
          disabled={disabled}
          onValueChange={(value) => onUpdateConfig("conditionOperator", value)}
          value={conditionOperator}
        >
          <SelectTrigger id="conditionOperator">
            <SelectValue placeholder="Selecione a condição" />
          </SelectTrigger>
          <SelectContent>
            {operators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Valor */}
      <div className="space-y-1">
        <Label htmlFor="conditionValue">Valor</Label>
        <Input
          disabled={disabled}
          id="conditionValue"
          onChange={(e) => onUpdateConfig("conditionValue", e.target.value)}
          placeholder={
            conditionField === "contact_tag"
              ? "ex: lead-quente"
              : conditionField === "message_text"
              ? "ex: sim, quero, preço"
              : "ex: João"
          }
          value={(config?.conditionValue as string) || ""}
        />
      </div>
    </div>
  );
}


function DelayFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="delayMs">Atraso (ms)</Label>
      <Input
        disabled={disabled}
        id="delayMs"
        onChange={(e) => onUpdateConfig("delayMs", e.target.value)}
        placeholder="1000"
        value={(config?.delayMs as string) || ""}
      />
      <p className="text-muted-foreground text-xs">
        Wait before continuing to the next node.
      </p>
    </div>
  );
}

function VariableFields({
  config,
  onUpdateConfig,
  disabled,
  mode,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
  mode: "set" | "get";
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor="variableKey">Chave da variável</Label>
      <Input
        disabled={disabled}
        id="variableKey"
        onChange={(e) => onUpdateConfig("variableKey", e.target.value)}
        placeholder="leadName"
        value={(config?.variableKey as string) || ""}
      />
      {mode === "set" && (
        <>
          <Label htmlFor="variableValue">Value</Label>
          <TemplateBadgeInput
            disabled={disabled}
            id="variableValue"
            onChange={(value) => onUpdateConfig("variableValue", value)}
            placeholder="Value or template"
            value={(config?.variableValue as string) || ""}
          />
        </>
      )}
      <p className="text-muted-foreground text-xs">
        {mode === "set"
          ? "Stores a value that can be used by later nodes."
          : "Reads a value stored earlier in the workflow."}
      </p>
    </div>
  );
}

export function ExecutionFields({
  config,
  onUpdateConfig,
  disabled,
}: {
  config: Record<string, unknown>;
  onUpdateConfig: (key: string, value: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-white/10 bg-black/40 p-4">
      <div className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
        Execução
      </div>
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="retryCount">Tentativas</Label>
          <Input
            disabled={disabled}
            id="retryCount"
            onChange={(e) => onUpdateConfig("retryCount", e.target.value)}
            placeholder="0"
            value={(config?.retryCount as string) || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="retryDelayMs">Atraso (ms)</Label>
          <Input
            disabled={disabled}
            id="retryDelayMs"
            onChange={(e) => onUpdateConfig("retryDelayMs", e.target.value)}
            placeholder="500"
            value={(config?.retryDelayMs as string) || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="timeoutMs">Timeout (ms)</Label>
          <Input
            disabled={disabled}
            id="timeoutMs"
            onChange={(e) => onUpdateConfig("timeoutMs", e.target.value)}
            placeholder="10000"
            value={(config?.timeoutMs as string) || ""}
          />
        </div>
      </div>
    </div>
  );
}

// System action fields wrapper - extracts conditional rendering to reduce complexity
export function SystemActionFields({
  actionType,
  config,
  onUpdateConfig,
  disabled,
}: SystemActionFieldsProps) {
  switch (actionType) {
    case "WhatsApp Message":
      return (
        <WhatsAppMessageFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case "WhatsApp Template":
      return (
        <div className="rounded-lg border border-muted bg-muted/30 p-4">
          <p className="text-sm text-muted-foreground">
            O seletor de Templates (Aprovados pela Meta) sera carregado aqui em breve!
          </p>
        </div>
      );
    case "Add Tag":
      return (
        <TagFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
          mode="add"
        />
      );
    case "Remove Tag":
      return (
        <TagFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
          mode="remove"
        />
      );
    case "HTTP Request":
      return (
        <HttpRequestFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case "Database Query":
      return (
        <DatabaseQueryFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case "Condition":
      return (
        <ConditionFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case "Delay":
      return (
        <DelayFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
        />
      );
    case "Set Variable":
      return (
        <VariableFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
          mode="set"
        />
      );
    case "Get Variable":
      return (
        <VariableFields
          config={config}
          disabled={disabled}
          onUpdateConfig={onUpdateConfig}
          mode="get"
        />
      );
    default:
      return null;
  }
}
