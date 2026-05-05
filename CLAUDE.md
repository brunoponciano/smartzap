# SmartZap — CLAUDE.md

SaaS single-tenant de automação de marketing via WhatsApp.
Stack: Next.js 16 (App Router), React 19, Supabase (PostgreSQL), Upstash QStash, Meta WhatsApp Cloud API v24.0, Vercel AI SDK v6.

## Convenções de Linguagem
- Código: inglês
- Comentários, docs, UI: português (pt-BR)

## Comandos de Desenvolvimento
npm run dev / build / lint
npm run test / test:watch / test:coverage
npm run test:e2e / test:e2e:ui / test:e2e:headed
npm run test:all
Convenção: *.test.ts → Vitest | *.spec.ts → Playwright (tests/e2e/)

## Arquitetura Frontend
Page → Hook → Service → API Route
- Pages: apenas conectam hook à view, sem lógica
- Hooks: React Query + estado local + estado derivado
- Services: fetch wrappers tipados
- API Routes: validação Zod + lógica + DB

## Arquitetura Backend
API Routes → QStash Workflow → Meta WhatsApp API
                ↓
          Supabase DB

## Diretórios Principais
app/(auth)/          # Login, install wizard
app/(dashboard)/     # Dashboard pages
app/api/             # 28+ API routes
components/features/ # Views presentacionais
components/ui/       # shadcn/ui (new-york)
hooks/               # Controller hooks
services/            # API client layer
lib/ai/              # Providers e prompts
lib/builder/         # Workflow executor + nodes
lib/whatsapp/        # Integração Meta API
types.ts             # Todas as interfaces e enums
supabase/migrations/ # 31+ migrations SQL

## Autenticação
Single-tenant, sem contas de usuário.
- Dashboard: MASTER_PASSWORD (bcrypt)
- API: Bearer <key> ou X-API-Key header
  - SMARTZAP_API_KEY → acesso geral
  - SMARTZAP_ADMIN_KEY → /api/database/*, /api/vercel/*
- Públicos (sem auth): /api/webhook, /api/health, /api/flows
- Auth por rota via verifyApiKey() em lib/auth.ts (sem middleware.ts)

## Supabase — Três Clients
- API Routes (server): getSupabaseAdmin() — bypassa RLS
- Client components: getSupabaseBrowser() — respeita RLS
- Server components: createClient() de @/lib/supabase-server
Ambos retornam null se env vars ausentes (permite install wizard sem config).

## Banco de Dados
Sem ORM. Queries diretas via lib/supabase-db.ts.
Tabelas principais: settings, campaigns, campaign_contacts, contacts, templates, flows, account_alerts

## Styling
Tailwind CSS v4 + shadcn/ui (new-york)
Cores: primary-400/500/600 (emerald), backgrounds zinc-800/900/950
Ícones: lucide-react exclusivamente

## WhatsApp
- Credenciais: Supabase settings → env vars → Redis cache (60s TTL)
- Erros: lib/whatsapp-errors.ts (44+ códigos mapeados)
- Telefones: E.164 via lib/phone-formatter.ts (libphonenumber-js)
- Rate limit: 1000 msg/s geral, 1 msg/6s por usuário (erro 131056)

## Workflow Engine
Upstash Workflow SDK com durable steps.
Executor: lib/builder/workflow-executor.workflow.ts
Nodes: start, message, template, menu, input, condition, delay, ai_agent, handoff, end

## Tipos Principais
CampaignStatus: DRAFT | SCHEDULED | SENDING | COMPLETED | PAUSED | FAILED
TemplateCategory: MARKETING | UTILIDADE | AUTENTICACAO
ContactStatus: OPT_IN | OPT_OUT | UNKNOWN

## Variáveis de Ambiente
Obrigatórias:
NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, SUPABASE_SECRET_KEY
QSTASH_TOKEN, MASTER_PASSWORD, SMARTZAP_API_KEY, SMARTZAP_ADMIN_KEY

Opcionais:
WHATSAPP_TOKEN, WHATSAPP_PHONE_ID, WHATSAPP_BUSINESS_ACCOUNT_ID
GEMINI_API_KEY, MEM0_API_KEY

## Comportamentos Conhecidos
- Edge cache: itens deletados podem reaparecer por até 10s (Vercel TTL)
- Payment alerts: auto-shown no erro 131042, auto-dismissed após entrega
- Null clients: getSupabaseAdmin/Browser() retornam null sem config — callers devem tratar
