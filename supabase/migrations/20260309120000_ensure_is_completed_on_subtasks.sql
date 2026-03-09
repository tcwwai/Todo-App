/*
  # Ensure is_completed column on subtasks

  This migration is defensive: if the subtasks table was created earlier
  without an is_completed column, this will add it so updates from the
  frontend (toggleSubtaskComplete) actually persist.
*/

ALTER TABLE subtasks
  ADD COLUMN IF NOT EXISTS is_completed boolean DEFAULT false;
