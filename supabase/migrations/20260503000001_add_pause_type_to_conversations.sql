ALTER TABLE workflow_conversations
  ADD COLUMN IF NOT EXISTS pause_type text NOT NULL DEFAULT 'question';
