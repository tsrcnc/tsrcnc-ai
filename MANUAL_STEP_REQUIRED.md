# 🚨 IMPORTANT: MANUAL STEP REQUIRED

## ⚠️ நீங்கள் செய்ய வேண்டியது (இது மட்டும் என்னால் முடியாது!)

### STEP: Supabase Database Setup

1. **Browser-ல் Supabase திறக்கவும்:**
   - https://supabase.com/dashboard
   - Login செய்யுங்கள்

2. **உங்கள் Project திறக்கவும்:**
   - Project: `wednrqynxlcudraawrni`

3. **SQL Editor க்கு போகவும்:**
   - Left sidebar > SQL Editor
   - "New query" click செய்யுங்கள்

4. **கீழே உள்ள SQL-ஐ copy செய்து paste செய்யுங்கள்:**

```sql
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
    qa_id UUID REFERENCES qa_interactions(id) ON DELETE CASCADE,
    reported_at TIMESTAMP DEFAULT NOW(),
    user_ip TEXT
);

-- Indexes for performance
CREATE INDEX idx_qa_hidden ON qa_interactions(hidden);
CREATE INDEX idx_qa_reports ON qa_interactions(reports);
CREATE INDEX idx_qa_created ON qa_interactions(created_at DESC);

-- Row Level Security
ALTER TABLE qa_interactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE answer_reports ENABLE ROW LEVEL SECURITY;

-- Public read policy (exclude hidden answers)
CREATE POLICY "Allow public read" ON qa_interactions
    FOR SELECT USING (hidden = FALSE);

CREATE POLICY "Allow insert" ON qa_interactions
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow update" ON qa_interactions
    FOR UPDATE USING (true);

CREATE POLICY "Allow public read reports" ON answer_reports
    FOR SELECT USING (true);
    
CREATE POLICY "Allow insert reports" ON answer_reports
    FOR INSERT WITH CHECK (true);
```

5. **"RUN" button click செய்யுங்கள் (அல்லது Ctrl+Enter)**

6. **Success message பார்க்கவும்:**
   - "Success. No rows returned" என்று காட்ட வேண்டும்

---

## ✅ அதன் பிறகு என்ன செய்வது:

1. Browser reload: `http://localhost:5173/`
2. Backend restart (automatically done)
3. Test features:
   - Ask a question
   - Click Like/Dislike
   - Click Report
   - Click "🛡️ Moderate"
   - Login with password: `CNC_Admin_2024_Secure!`

---

## 📝 Admin Password:
```
CNC_Admin_2024_Secure!
```

---

## 🎯 All Files Updated:

✅ backend/server.js - Complete with Q&A tracking
✅ backend/.env - Admin password added
✅ frontend/src/App.jsx - Rating buttons added
✅ frontend/src/Admin.jsx - Already done
✅ frontend/src/Moderation.jsx - NEW moderation panel
✅ frontend/src/Moderation.css - NEW styles  
✅ frontend/src/App.css - Rating button styles

---

## 🚀 After SQL Setup, Everything Will Work!

இது மட்டும் என்னால் செய்ய முடியாது. மற்றபடி எல்லாம் ready!
