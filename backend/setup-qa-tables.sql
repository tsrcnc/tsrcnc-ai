-- Run this SQL in Supabase SQL Editor

-- Table to store Q&A interactions
CREATE TABLE IF NOT EXISTS qa_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    question TEXT NOT NULL,
    answer TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW(),
    hidden BOOLEAN DEFAULT FALSE,
    likes INTEGER DEFAULT 0,
    dislikes INTEGER DEFAULT 0,
    reports INTEGER DEFAULT 0
);

-- Table to track individual reports
CREATE TABLE IF NOT EXISTS answer_reports (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    qa_id UUID REFERENCES qa_interactions(id),
    reported_at TIMESTAMP DEFAULT NOW(),
    user_ip TEXT
);

-- Create index for faster queries
CREATE INDEX idx_qa_hidden ON qa_interactions(hidden);
CREATE INDEX idx_qa_reports ON qa_interactions(reports);

-- Row Level Security (optional)
ALTER TABLE qa_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_reports ENABLE ROW LEVEL SECURITY;

-- Policy to allow read for everyone
CREATE POLICY "Allow public read" ON qa_interactions
    FOR SELECT USING (true);

CREATE POLICY "Allow insert" ON qa_interactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update" ON qa_interactions
    FOR UPDATE USING (true);
