-- Tabela de automações: trigger de texto → resposta automática
-- Usada quando um lead clica em botão de template (ex: "Assistir Aula")
-- e o sistema envia automaticamente uma mensagem de resposta.

CREATE TABLE public.auto_replies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    trigger_text text NOT NULL,
    response_message text NOT NULL,
    is_active boolean NOT NULL DEFAULT true,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now()
);

-- Índice único case-insensitive para evitar triggers duplicados
CREATE UNIQUE INDEX auto_replies_trigger_lower_idx ON public.auto_replies (lower(trigger_text));

-- Trigger para atualizar updated_at automaticamente
CREATE OR REPLACE FUNCTION update_auto_replies_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER auto_replies_updated_at
    BEFORE UPDATE ON public.auto_replies
    FOR EACH ROW
    EXECUTE FUNCTION update_auto_replies_updated_at();
