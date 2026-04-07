# Design: Filtro de múltiplas tags (incluir/excluir) em Campanhas

**Data:** 2026-04-07  
**Status:** Aprovado

## Contexto

Atualmente o wizard de campanhas permite filtrar contatos por **uma única tag de inclusão** (`includeTag: string | null`). O usuário quer poder selecionar **múltiplas tags para incluir** e **múltiplas tags para excluir** do público.

Lógica desejada:
- **Inclusão (OR):** contato precisa ter pelo menos uma das tags selecionadas
- **Exclusão (OR):** contato é removido se tiver qualquer uma das tags de exclusão

## Arquivos afetados

| Arquivo | Mudança |
|---|---|
| `lib/business/audience/criteria-validator.ts` | Adicionar `includeTags` e `excludeTags` ao tipo e à lógica de filtro |
| `components/features/campaigns/wizard/steps/audience/types.ts` | Adicionar `includeTags` e `excludeTags` ao `AudienceCriteria` do wizard |
| `components/features/campaigns/wizard/steps/audience/SegmentsSheet.tsx` | UI com duas sub-seções: Incluir / Excluir |
| `components/features/campaigns/wizard/steps/audience/useAudienceSelection.ts` | Atualizar `segmentsSubtitle` |
| `hooks/campaigns/campaignWizardReducer.ts` | Inicializar `includeTags: []` e `excludeTags: []` |
| `hooks/useCampaignWizard.ts` | Atualizar reset de critérios |
| `lib/business/audience/criteria-validator.test.ts` | Testes para os novos campos |

## Decisões de design

### Retrocompatibilidade de `includeTag`

`includeTag` (singular) permanece no tipo como campo opcional. A lógica em `isContactEligible` avalia `includeTags` (array) com prioridade. Se `includeTags` estiver vazio ou ausente, cai no `includeTag` legado. Isso garante que nenhum fluxo existente quebre.

### Sem mudança de banco

`audienceCriteria` é estado em memória do wizard React — não é persistido em banco nem em localStorage. Nenhuma migração SQL necessária.

### Lógica de filtro

```
inclusão: contact.tags intersects includeTags (OR) — ou sem filtro se includeTags vazio
exclusão: NOT (contact.tags intersects excludeTags) — aplicado após inclusão
```

## UI — SegmentsSheet

A seção **Tags** é reorganizada em duas sub-seções:

**Incluir tags** (borda/chips verdes):
- Input de busca filtra a lista
- Clicar em uma tag a adiciona a `includeTags` (toggle)
- Chips das tags selecionadas aparecem acima da lista com botão ×

**Excluir tags** (borda/chips laranja/vermelhos):
- Mesmo padrão visual, cor diferente
- Clicar adiciona a `excludeTags` (toggle)
- Chips aparecem com ícone de proibido ou ×

O `handleApplyTag` atual é substituído por funções de toggle que atualizam os arrays e chamam `applyAudienceCriteria` com o estado completo.

## Subtítulo do segmento

`segmentsSubtitle` em `useAudienceSelection.ts` é atualizado para:
- Se só inclusão: `Tags: lead, vip • 353 contatos`
- Se só exclusão: `Excluindo: nao_assisistiu • 2415 contatos`
- Se ambos: `Tags: lead • Excluindo: nao_assisistiu • 353 contatos`
- Fallback para comportamento atual se `includeTags`/`excludeTags` vazios

## Testes

Adicionar casos em `criteria-validator.test.ts`:
- Contato com tag incluída → elegível
- Contato sem nenhuma tag incluída → inelegível
- Contato com tag excluída → inelegível
- Contato com tag incluída E excluída → inelegível (exclusão prevalece)
- Arrays vazios → sem filtro (comportamento atual preservado)
