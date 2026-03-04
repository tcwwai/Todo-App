/*
  # Add due_date to todos table

  1. New Columns
    - `due_date` (timestamp, optional completion date for the todo item)

  2. Changes
    - Add nullable due_date column to todos table
    - This allows users to set optional target completion dates

  3. Security
    - No changes to existing RLS policies required
*/

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'todos' AND column_name = 'due_date'
  ) THEN
    ALTER TABLE todos ADD COLUMN due_date timestamptz;
  END IF;
END $$;