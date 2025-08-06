-- Fix journal_entries table to add missing updated_by field
-- This addresses the error: record "new" has no field "updated_by"

-- Add missing updated_by field to journal_entries table
ALTER TABLE journal_entries 
ADD COLUMN updated_by UUID REFERENCES users(id),
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

-- Update existing trigger function to handle the new fields properly
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Add trigger to automatically update updated_at field
CREATE TRIGGER update_journal_entries_updated_at
    BEFORE UPDATE ON journal_entries
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add trigger to journal_entry_lines as well for consistency
ALTER TABLE journal_entry_lines 
ADD COLUMN updated_at TIMESTAMP DEFAULT NOW();

CREATE TRIGGER update_journal_entry_lines_updated_at
    BEFORE UPDATE ON journal_entry_lines
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();
