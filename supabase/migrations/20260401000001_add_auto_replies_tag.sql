-- Adiciona campo tag opcional na tabela auto_replies
-- Quando preenchido, o sistema aplica essa tag ao contato ao disparar a automação

ALTER TABLE public.auto_replies
    ADD COLUMN IF NOT EXISTS tag text;
