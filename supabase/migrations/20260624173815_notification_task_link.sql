ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS task_id INTEGER,
  ADD COLUMN IF NOT EXISTS project_id INTEGER;

CREATE INDEX IF NOT EXISTS idx_notif_task ON notifications(task_id);
