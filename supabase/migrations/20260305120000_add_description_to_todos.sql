/*
  # Add description to todos table

  1. New Columns
    - `description` (text, optional details for the todo item)

  2. Changes
    - Add nullable description column to todos table if it does not already exist

  3. Security
    - No changes to existing RLS policies required
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'description'
  ) THEN
    ALTER TABLE todos ADD COLUMN description text;
  END IF;
END $$;
