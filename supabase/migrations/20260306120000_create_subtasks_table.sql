/*
  # Create subtasks table

  1. New Tables
    - `subtasks`
      - `id` (uuid, primary key)
      - `todo_id` (uuid, parent todo reference)
      - `title` (text, the sub-task content)
      - `is_completed` (boolean, completion status)
      - `due_date` (timestamp, optional)
      - `created_at` (timestamp, when the sub-task was created)

  2. Security
    - Enable RLS on `subtasks` table
    - Add public access policies for SELECT / INSERT / UPDATE / DELETE

  3. Notes
    - `todo_id` references `todos.id` and cascades on delete so
      deleting a parent task will also delete its subtasks.
*/

CREATE TABLE IF NOT EXISTS subtasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  todo_id uuid NOT NULL REFERENCES todos(id) ON DELETE CASCADE,
  title text NOT NULL,
  is_completed boolean DEFAULT false,
  due_date timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE subtasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view subtasks"
  ON subtasks FOR SELECT
  USING (true);

CREATE POLICY "Public can create subtasks"
  ON subtasks FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update subtasks"
  ON subtasks FOR UPDATE
  WITH CHECK (true);

CREATE POLICY "Public can delete subtasks"
  ON subtasks FOR DELETE
  USING (true);
