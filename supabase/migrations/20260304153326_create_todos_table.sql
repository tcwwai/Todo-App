/*
  # Create todos table

  1. New Tables
    - `todos`
      - `id` (uuid, primary key)
      - `task` (text, the todo item content)
      - `is_completed` (boolean, completion status)
      - `created_at` (timestamp, when the todo was created)
  
  2. Security
    - Enable RLS on `todos` table
    - Add public access policy for SELECT (anyone can view)
    - Add public access policy for INSERT (anyone can create)
    - Add public access policy for UPDATE (anyone can update)
    - Add public access policy for DELETE (anyone can delete)
    
  3. Notes
    - Public access allows anyone to manage todos (no authentication required)
    - This is appropriate for a simple shared todo list
*/

CREATE TABLE IF NOT EXISTS todos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  task text NOT NULL,
  is_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE todos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public can view todos"
  ON todos FOR SELECT
  USING (true);

CREATE POLICY "Public can create todos"
  ON todos FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Public can update todos"
  ON todos FOR UPDATE
  WITH CHECK (true);

CREATE POLICY "Public can delete todos"
  ON todos FOR DELETE
  USING (true);