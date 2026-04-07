'use client';

import React from 'react';
import { X, PlusCircle, MinusCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ContactStatus } from '@/types';
import { formatPhoneNumberDisplay } from '@/lib/phone-formatter';
import { SegmentsSheetProps, AudienceCriteria } from './types';

export function SegmentsSheet({
  audienceStats,
  audienceCriteria,
  customFields,
  allContacts,
  recipientSource,
  segmentTagDraft,
  setSegmentTagDraft,
  segmentDdiDraft,
  setSegmentDdiDraft,
  segmentCustomFieldKeyDraft,
  setSegmentCustomFieldKeyDraft,
  segmentCustomFieldModeDraft,
  setSegmentCustomFieldModeDraft,
  segmentCustomFieldValueDraft,
  setSegmentCustomFieldValueDraft,
  segmentOneContactDraft,
  setSegmentOneContactDraft,
  applyAudienceCriteria,
  onClose,
  onOpenRefine,
  onPickOneContact,
}: SegmentsSheetProps) {
  const isDisabled = recipientSource === 'test';

  const currentIncludeTags: string[] = audienceCriteria?.includeTags ?? [];
  const currentExcludeTags: string[] = audienceCriteria?.excludeTags ?? [];

  const buildUpdatedCriteria = (
    newIncludeTags: string[],
    newExcludeTags: string[]
  ): AudienceCriteria => ({
    status: audienceCriteria?.status ?? 'ALL',
    includeTag: null,
    includeTags: newIncludeTags,
    excludeTags: newExcludeTags,
    createdWithinDays: audienceCriteria?.createdWithinDays ?? null,
    excludeOptOut: true,
    noTags: false,
    uf: audienceCriteria?.uf ?? null,
    ddi: audienceCriteria?.ddi ?? null,
    customFieldKey: null,
    customFieldMode: null,
    customFieldValue: null,
  });

  const toggleIncludeTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    const already = currentIncludeTags.map((t) => t.toLowerCase()).includes(normalized);
    const newInclude = already
      ? currentIncludeTags.filter((t) => t.toLowerCase() !== normalized)
      : [...currentIncludeTags, tag.trim()];
    const newExclude = currentExcludeTags.filter((t) => t.toLowerCase() !== normalized);
    applyAudienceCriteria?.(buildUpdatedCriteria(newInclude, newExclude), 'manual');
  };

  const toggleExcludeTag = (tag: string) => {
    const normalized = tag.trim().toLowerCase();
    const already = currentExcludeTags.map((t) => t.toLowerCase()).includes(normalized);
    const newExclude = already
      ? currentExcludeTags.filter((t) => t.toLowerCase() !== normalized)
      : [...currentExcludeTags, tag.trim()];
    const newInclude = currentIncludeTags.filter((t) => t.toLowerCase() !== normalized);
    applyAudienceCriteria?.(buildUpdatedCriteria(newInclude, newExclude), 'manual');
  };

  const handleApplyDdi = (ddi: string) => {
    applyAudienceCriteria?.(
      {
        status: audienceCriteria?.status ?? 'ALL',
        includeTag: null,
        includeTags: currentIncludeTags,
        excludeTags: currentExcludeTags,
        createdWithinDays: audienceCriteria?.createdWithinDays ?? null,
        excludeOptOut: true,
        noTags: false,
        uf: null,
        ddi: String(ddi),
        customFieldKey: null,
        customFieldMode: null,
        customFieldValue: null,
      },
      'manual'
    );
    onClose();
  };

  const handleApplyUf = (uf: string) => {
    applyAudienceCriteria?.(
      {
        status: audienceCriteria?.status ?? 'ALL',
        includeTag: null,
        includeTags: currentIncludeTags,
        excludeTags: currentExcludeTags,
        createdWithinDays: audienceCriteria?.createdWithinDays ?? null,
        excludeOptOut: true,
        noTags: false,
        uf,
        ddi: null,
        customFieldKey: null,
        customFieldMode: null,
        customFieldValue: null,
      },
      'manual'
    );
    onClose();
  };

  const handleApplyCustomField = () => {
    const key = String(segmentCustomFieldKeyDraft || '').trim();
    if (!key) return;
    applyAudienceCriteria?.(
      {
        status: audienceCriteria?.status ?? 'ALL',
        includeTag: null,
        includeTags: currentIncludeTags,
        excludeTags: currentExcludeTags,
        createdWithinDays: audienceCriteria?.createdWithinDays ?? null,
        excludeOptOut: true,
        noTags: false,
        uf: null,
        ddi: null,
        customFieldKey: key,
        customFieldMode: segmentCustomFieldModeDraft,
        customFieldValue:
          segmentCustomFieldModeDraft === 'equals'
            ? segmentCustomFieldValueDraft.trim()
            : null,
      },
      'manual'
    );
    onClose();
  };

  const filteredTags = (audienceStats?.tagCountsEligible ?? [])
    .filter(({ tag }) => {
      const q = (segmentTagDraft || '').trim().toLowerCase();
      if (!q) return true;
      return String(tag || '').toLowerCase().includes(q);
    })
    .slice(0, 50);

  const filteredContacts = allContacts
    .filter((c) => c.status !== ContactStatus.OPT_OUT)
    .filter((c) => {
      const q = segmentOneContactDraft.trim().toLowerCase();
      const name = String(c.name || '').toLowerCase();
      const phone = String(c.phone || '').toLowerCase();
      const email = String(c.email || '').toLowerCase();
      return name.includes(q) || phone.includes(q) || email.includes(q);
    })
    .slice(0, 8);

  const includeSet = new Set(currentIncludeTags.map((t) => t.toLowerCase()));
  const excludeSet = new Set(currentExcludeTags.map((t) => t.toLowerCase()));

  return (
    <div className="bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-default)] rounded-2xl p-5 mt-4 animate-in fade-in slide-in-from-bottom-2 duration-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-bold text-[var(--ds-text-primary)]">Segmentos</p>
          <p className="text-xs text-[var(--ds-text-muted)]">
            Escolhas rápidas — sem virar construtor de filtros.
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-[var(--ds-bg-hover)] text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors"
          aria-label="Fechar"
        >
          <X size={16} />
        </button>
      </div>

      <div className="mt-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Tags */}
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-bold text-[var(--ds-text-muted)] uppercase tracking-wider">
              Tags
            </p>
            <button
              type="button"
              className="text-xs text-[var(--ds-text-secondary)] hover:text-[var(--ds-text-primary)] transition-colors"
              onClick={() => setSegmentTagDraft('')}
              disabled={isDisabled}
            >
              Limpar busca
            </button>
          </div>

          {(currentIncludeTags.length > 0 || currentExcludeTags.length > 0) && (
            <div className="flex flex-wrap gap-1.5">
              {currentIncludeTags.map((tag) => (
                <span
                  key={`inc-${tag}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-emerald-900/40 border border-emerald-700/50 text-emerald-300"
                >
                  <PlusCircle size={10} />
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggleIncludeTag(tag)}
                    className="ml-0.5 hover:text-white"
                    disabled={isDisabled}
                    aria-label={`Remover tag incluída ${tag}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
              {currentExcludeTags.map((tag) => (
                <span
                  key={`exc-${tag}`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-orange-900/40 border border-orange-700/50 text-orange-300"
                >
                  <MinusCircle size={10} />
                  {tag}
                  <button
                    type="button"
                    onClick={() => toggleExcludeTag(tag)}
                    className="ml-0.5 hover:text-white"
                    disabled={isDisabled}
                    aria-label={`Remover tag excluída ${tag}`}
                  >
                    <X size={10} />
                  </button>
                </span>
              ))}
            </div>
          )}

          <Input
            value={segmentTagDraft}
            onChange={(e) => setSegmentTagDraft(e.target.value)}
            placeholder="Buscar tag…"
            className="bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)]"
            disabled={isDisabled}
          />

          <div className="max-h-56 overflow-auto rounded-xl border border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)]">
            {filteredTags.map(({ tag, count }) => {
              const tagStr = String(tag);
              const tagLower = tagStr.toLowerCase();
              const isIncluded = includeSet.has(tagLower);
              const isExcluded = excludeSet.has(tagLower);

              return (
                <div
                  key={tagStr}
                  className={`w-full px-3 py-2 flex items-center justify-between text-sm transition-colors ${
                    isIncluded
                      ? 'bg-emerald-900/20 border-l-2 border-emerald-600'
                      : isExcluded
                      ? 'bg-orange-900/20 border-l-2 border-orange-600'
                      : 'hover:bg-[var(--ds-bg-hover)]'
                  }`}
                >
                  <span className="truncate pr-2 text-[var(--ds-text-secondary)]">{tagStr}</span>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-xs text-[var(--ds-text-secondary)]">{count}</span>
                    <button
                      type="button"
                      onClick={() => toggleIncludeTag(tagStr)}
                      disabled={isDisabled}
                      title="Incluir contatos com esta tag"
                      aria-label={`Incluir tag ${tagStr}`}
                      className={`p-1 rounded transition-colors ${
                        isIncluded
                          ? 'text-emerald-400 hover:text-emerald-300'
                          : 'text-[var(--ds-text-muted)] hover:text-emerald-400'
                      }`}
                    >
                      <PlusCircle size={14} />
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleExcludeTag(tagStr)}
                      disabled={isDisabled}
                      title="Excluir contatos com esta tag"
                      aria-label={`Excluir tag ${tagStr}`}
                      className={`p-1 rounded transition-colors ${
                        isExcluded
                          ? 'text-orange-400 hover:text-orange-300'
                          : 'text-[var(--ds-text-muted)] hover:text-orange-400'
                      }`}
                    >
                      <MinusCircle size={14} />
                    </button>
                  </div>
                </div>
              );
            })}

            {(audienceStats?.tagCountsEligible?.length ?? 0) === 0 && (
              <div className="px-3 py-3 text-xs text-[var(--ds-text-muted)]">
                Nenhuma tag encontrada.
              </div>
            )}
          </div>

          <div className="flex gap-3 text-xs text-[var(--ds-text-muted)]">
            <span className="flex items-center gap-1">
              <PlusCircle size={10} className="text-emerald-500" /> Incluir
            </span>
            <span className="flex items-center gap-1">
              <MinusCircle size={10} className="text-orange-500" /> Excluir
            </span>
          </div>
        </div>

        {/* DDI/UF/Custom Fields */}
        <div className="space-y-2">
          <p className="text-xs font-bold text-[var(--ds-text-muted)] uppercase tracking-wider">
            País (DDI)
          </p>
          <p className="text-xs text-[var(--ds-text-muted)]">
            Derivado do telefone (ex.: +55).
          </p>

          {(audienceStats?.ddiCountsEligible?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(audienceStats?.ddiCountsEligible ?? [])
                .slice(0, 10)
                .map(({ ddi, count }) => (
                  <button
                    key={ddi}
                    type="button"
                    onClick={() => handleApplyDdi(ddi)}
                    disabled={isDisabled}
                    className="px-3 py-1 rounded-full bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-default)] text-[var(--ds-text-secondary)] text-xs hover:bg-[var(--ds-bg-hover)] disabled:opacity-50 disabled:hover:bg-[var(--ds-bg-elevated)]"
                  >
                    +{ddi} <span className="text-[var(--ds-text-secondary)]">({count})</span>
                  </button>
                ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--ds-text-muted)]">
              Sem dados suficientes para sugerir DDI</p>
          )}

          <div className="grid grid-cols-3 gap-2">
            <div className="col-span-2">
              <Input
                value={segmentDdiDraft}
                onChange={(e) => setSegmentDdiDraft(e.target.value)}
                placeholder="ex: 55"
                className="bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)]"
                disabled={isDisabled}
              />
            </div>
            <Button
              type="button"
              variant="outline"
              className="border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)]"
              onClick={() => {
                const ddi = String(segmentDdiDraft || '')
                  .trim()
                  .replace(/^\+/, '');
                if (!ddi) return;
                handleApplyDdi(ddi);
              }}
              disabled={isDisabled}
            >
              Aplicar
            </Button>
          </div>

          <p className="text-xs font-bold text-[var(--ds-text-muted)] uppercase tracking-wider">
            Estado (UF - BR)
          </p>
          <p className="text-xs text-[var(--ds-text-muted)]">
            Derivado do DDD.
          </p>

          {(audienceStats?.brUfCounts?.length ?? 0) > 0 ? (
            <div className="flex flex-wrap gap-2">
              {(audienceStats?.brUfCounts ?? [])
                .slice(0, 12)
                .map(({ uf, count }) => (
                  <button
                    key={uf}
                    type="button"
                    onClick={() => handleApplyUf(uf)}
                    disabled={isDisabled}
                    className="px-3 py-1 rounded-full bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-default)] text-[var(--ds-text-secondary)] text-xs hover:bg-[var(--ds-bg-hover)] disabled:opacity-50 disabled:hover:bg-[var(--ds-bg-elevated)]"
                  >
                    {uf} <span className="text-[var(--ds-text-secondary)]">({count})</span>
                  </button>
                ))}
            </div>
          ) : (
            <p className="text-xs text-[var(--ds-text-muted)]">
              Sem dados suficientes para sugerir UFs.
            </p>
          )}

          <div className="pt-3 border-t border-[var(--ds-border-subtle)]">
            <p className="text-xs font-bold text-[var(--ds-text-muted)] uppercase tracking-wider">
              Campos personalizados
            </p>
            <p className="text-xs text-[var(--ds-text-muted)] mt-1">
              Filtre por um campo do contato.
            </p>

            <div className="grid grid-cols-1 gap-2 mt-2">
              <select
                value={segmentCustomFieldKeyDraft}
                onChange={(e) => setSegmentCustomFieldKeyDraft(e.target.value)}
                className="w-full bg-[var(--ds-bg-elevated)] border border-[var(--ds-border-default)] rounded-lg px-3 py-2 text-sm text-[var(--ds-text-primary)] focus:outline-none focus:border-primary-500"
                disabled={isDisabled}
              >
                <option value="">Selecione um campo…</option>
                {customFields
                  .filter((f) => f.entity_type === 'contact')
                  .sort((a, b) => a.label.localeCompare(b.label))
                  .map((f) => (
                    <option key={f.id} value={f.key}>
                      {f.label}
                    </option>
                  ))}
              </select>

              <div className="grid grid-cols-2 gap-2">
                <Button
                  type="button"
                  variant={segmentCustomFieldModeDraft === 'exists' ? 'default' : 'outline'}
                  className={
                    segmentCustomFieldModeDraft === 'exists'
                      ? 'bg-primary-600 text-white hover:bg-primary-500'
                      : 'border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)]'
                  }
                  onClick={() => setSegmentCustomFieldModeDraft('exists')}
                  disabled={isDisabled || !segmentCustomFieldKeyDraft}
                >
                  Tem valor
                </Button>
                <Button
                  type="button"
                  variant={segmentCustomFieldModeDraft === 'equals' ? 'default' : 'outline'}
                  className={
                    segmentCustomFieldModeDraft === 'equals'
                      ? 'bg-primary-600 text-white hover:bg-primary-500'
                      : 'border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)]'
                  }
                  onClick={() => setSegmentCustomFieldModeDraft('equals')}
                  disabled={isDisabled || !segmentCustomFieldKeyDraft}
                >
                  Igual a
                </Button>
              </div>

              {segmentCustomFieldModeDraft === 'equals' && (
                <Input
                  value={segmentCustomFieldValueDraft}
                  onChange={(e) => setSegmentCustomFieldValueDraft(e.target.value)}
                  placeholder="ex: prata"
                  className="bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)]"
                  disabled={isDisabled || !segmentCustomFieldKeyDraft}
                />
              )}

              <Button
                type="button"
                className="bg-primary-600 text-white hover:bg-primary-500"
                disabled={
                  isDisabled ||
                  !segmentCustomFieldKeyDraft ||
                  (segmentCustomFieldModeDraft === 'equals' &&
                    !segmentCustomFieldValueDraft.trim())
                }
                onClick={handleApplyCustomField}
              >
                Aplicar
              </Button>
            </div>

            <div className="pt-4 border-t border-[var(--ds-border-subtle)] mt-4">
              <p className="text-xs font-bold text-[var(--ds-text-muted)] uppercase tracking-wider">
                Buscar 1 contato
              </p>
              <p className="text-xs text-[var(--ds-text-muted)] mt-1">
                Atalho para seleção manual.
              </p>

              <Input
                value={segmentOneContactDraft}
                onChange={(e) => setSegmentOneContactDraft(e.target.value)}
                placeholder="Nome, telefone, email…"
                className="bg-[var(--ds-bg-elevated)] border-[var(--ds-border-default)] text-[var(--ds-text-primary)] placeholder:text-[var(--ds-text-muted)] mt-2"
                disabled={isDisabled}
              />

              {(segmentOneContactDraft || '').trim() && (
                <div className="mt-2 max-h-40 overflow-auto rounded-xl border border-[var(--ds-border-default)] bg-[var(--ds-bg-surface)]">
                  {filteredContacts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      className="w-full px-3 py-2 flex items-center justify-between text-sm text-[var(--ds-text-secondary)] hover:bg-[var(--ds-bg-hover)] transition-colors"
                      onClick={() => {
                        onPickOneContact(c.id, segmentOneContactDraft);
                        onClose();
                      }}
                      disabled={isDisabled}
                    >
                      <span className="truncate pr-3">{c.name || c.phone}</span>
                      <span className="text-xs text-[var(--ds-text-muted)] shrink-0 font-mono">
                        {formatPhoneNumberDisplay(c.phone, 'e164')}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          className="border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)]"
          onClick={onClose}
        >
          Fechar
        </Button>
        <Button
          type="button"
          variant="outline"
          className="border-[var(--ds-border-default)] bg-[var(--ds-bg-elevated)] text-[var(--ds-text-primary)] hover:bg-[var(--ds-bg-hover)]"
          onClick={onOpenRefine}
          disabled={isDisabled}
        >
          Ajustar status/recência…
        </Button>
      </div>
    </div>
  );
}
