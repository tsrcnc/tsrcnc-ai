# CNC AI Quality Control System - Complete Implementation Guide

## 📋 Overview

இந்த guide உங்கள் CNC AI Assistant-க்கு முழுமையான Quality Control System சேர்க்கும்.

### ✨ Features:
1. ❤️ Like/Dislike buttons for each answer
2. 🚩 Report system (auto-hide after 3 reports)
3. 📢 Public data crowdsourced notice
4. 🔐 Password-protected admin moderation panel
5. ✅ Approve/Delete reported content
6. 💡 Smart "no data" message with Train AI prompt

---

## STEP 1: Database Setup (Supabase SQL)

### Run this SQL in Supabase Dashboard > SQL Editor:

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

-- Public read policy
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

---

## STEP 2: Update Backend (.env)

Add to `backend/.env`:

```env
ADMIN_PASSWORD=YourSecurePassword123!
```

---

## STEP 3: Update Backend (server.js)

### Replace the `/api/chat` endpoint with this:

```javascript
// CHAT ENDPOINT (with Q&A tracking)
app.post('/api/chat', async (req, res) => {
    try {
        const { message } = req.body;
        
        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const cacheKey = message.toLowerCase().trim();

        // Check cache
        if (responseCache.has(cacheKey)) {
            console.log('✅ Cache HIT!');
            return res.json({
                answer: responseCache.get(cacheKey),
                cached: true
            });
        }

        console.log('❌ Cache MISS. Making API calls...');
        const documents = await searchDocuments(message, 3);
        
        const context = documents.map(doc => doc.content).join('\n\n');

        let answer;
        let noData = false;

        if (!context) {
            noData = true;
            answer = "I don't have information about this in my knowledge base. If you know about this topic, please use the 🎓 **Train AI** button to add content and help others!";
        } else {
            answer = await generateAnswer(message, context);
        }

        responseCache.set(cacheKey, answer);

        // Save Q&A to database
        const { data: qaData, error: qaError } = await supabase
            .from('qa_interactions')
            .insert({
                question: message,
                answer: answer,
                hidden: false
            })
            .select()
            .single();

        if (qaError) {
            console.error('Error saving Q&A:', qaError);
        }

        res.json({ 
            answer, 
            cached: false,
            noData,
            qaId: qaData?.id
        });

    } catch (error) {
        console.error('Chat error:', error);
        res.status(500).json({ error: error.message });
    }
});

// LIKE/DISLIKE ENDPOINT
app.post('/api/rate-answer', async (req, res) => {
    try {
        const { qaId, type } = req.body; // type: 'like' or 'dislike'

        if (!qaId || !type) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        // Get current values
        const { data: qa } = await supabase
            .from('qa_interactions')
            .select('likes, dislikes')
            .eq('id', qaId)
            .single();

        if (!qa) {
            return res.status(404).json({ error: 'Q&A not found' });
        }

        // Update
        const update = type === 'like' 
            ? { likes: qa.likes + 1 }
            : { dislikes: qa.dislikes + 1 };

        await supabase
            .from('qa_interactions')
            .update(update)
            .eq('id', qaId);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// REPORT ANSWER ENDPOINT
app.post('/api/report-answer', async (req, res) => {
    try {
        const { qaId } = req.body;

        if (!qaId) {
            return res.status(400).json({ error: 'Missing qaId' });
        }

        // Get current report count
        const { data: qa } = await supabase
            .from('qa_interactions')
            .select('reports')
            .eq('id', qaId)
            .single();

        const newReportCount = (qa?.reports || 0) + 1;
        const shouldHide = newReportCount >= 3; // Auto-hide after 3 reports

        // Update Q&A
        await supabase
            .from('qa_interactions')
            .update({ 
                reports: newReportCount,
                hidden: shouldHide
            })
            .eq('id', qaId);

        // Log report
        await supabase
            .from('answer_reports')
            .insert({
                qa_id: qaId,
                user_ip: req.ip || 'unknown'
            });

        res.json({ 
            success: true, 
            hidden: shouldHide,
            reports: newReportCount
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// GET REPORTED ANSWERS (Admin only - add password check)
app.get('/api/admin/reported-answers', async (req, res) => {
    try {
        const { password } = req.query;

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        const { data, error } = await supabase
            .from('qa_interactions')
            .select('*')
            .gt('reports', 0)
            .order('reports', { ascending: false });

        if (error) throw error;

        res.json({ answers: data });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// APPROVE REPORTED ANSWER (reset reports, unhide)
app.post('/api/admin/approve-answer', async (req, res) => {
    try {
        const { password, qaId } = req.body;

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await supabase
            .from('qa_interactions')
            .update({ reports: 0, hidden: false })
            .eq('id', qaId);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// DELETE ANSWER (permanent)
app.post('/api/admin/delete-answer', async (req, res) => {
    try {
        const { password, qaId } = req.body;

        if (password !== process.env.ADMIN_PASSWORD) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        await supabase
            .from('qa_interactions')
            .delete()
            .eq('id', qaId);

        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});
```

---

## STEP 4: Update Frontend (App.jsx)

### Update the message display to include rating buttons:

```javascript
{messages.map((msg, i) => (
  <div key={i} className={`message ${msg.role}`}>
    <div className="message-content">
      {msg.role === 'ai' ? (
        <>
          <ReactMarkdown>{msg.content}</ReactMarkdown>
          
          {/* Rating buttons */}
          {msg.qaId && !msg.cached && (
            <div className="message-actions">
              <button 
                className="action-btn like-btn"
                onClick={() => rateAnswer(msg.qaId, 'like')}
                title="Helpful answer"
              >
                👍 Like
              </button>
              <button 
                className="action-btn dislike-btn"
                onClick={() => rateAnswer(msg.qaId, 'dislike')}
                title="Not helpful"
              >
                👎 Dislike
              </button>
              <button 
                className="action-btn report-btn"
                onClick={() => reportAnswer(msg.qaId)}
                title="Report incorrect information"
              >
                🚩 Report
              </button>
            </div>
          )}

          {/* Public data notice */}
          {!msg.cached && (
            <div className="data-notice">
              ℹ️ This answer is crowdsourced from community contributions. 
              If you notice any errors, please report.
            </div>
          )}
        </>
      ) : (
        msg.content
      )}
    </div>
  </div>
))}
```

### Add these functions in App.jsx:

```javascript
const rateAnswer = async (qaId, type) => {
  try {
    await fetch('http://localhost:3000/api/rate-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qaId, type })
    });
    // Optional: Show toast notification
  } catch (error) {
    console.error('Rating error:', error);
  }
};

const reportAnswer = async (qaId) => {
  if (!confirm('Report this answer as incorrect?')) return;

  try {
    const response = await fetch('http://localhost:3000/api/report-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qaId })
    });

    const data = await response.json();

    if (data.hidden) {
      alert('Thank you! This answer has been hidden after multiple reports and will be reviewed by moderators.');
    } else {
      alert(`Thank you for reporting! (${data.reports}/3 reports)`);
    }
  } catch (error) {
    console.error('Report error:', error);
  }
};
```

### Update message state to include qaId:

```javascript
const aiMessage = { 
  role: 'ai', 
  content: data.answer, 
  cached: data.cached,
  qaId: data.qaId 
};
```

---

## STEP 5: Add CSS for Rating Buttons (App.css)

```css
.message-actions {
  display: flex;
  gap: 10px;
  margin-top: 15px;
  padding-top: 10px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.action-btn {
  padding: 6px 12px;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 5px;
  background: rgba(255, 255, 255, 0.05);
  color: #fff;
  font-size: 0.85em;
  cursor: pointer;
  transition: all 0.3s;
}

.action-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  transform: scale(1.05);
}

.like-btn:hover {
  border-color: #4caf50;
  color: #4caf50;
}

.dislike-btn:hover {
  border-color: #f44336;
  color: #f44336;
}

.report-btn:hover {
  border-color: #ff9800;
  color: #ff9800;
}

.data-notice {
  margin-top: 10px;
  padding: 8px 12px;
  background: rgba(255, 193, 7, 0.1);
  border-left: 3px solid #ffc107;
  border-radius: 4px;
  font-size: 0.8em;
  opacity: 0.8;
}
```

---

## STEP 6: Create Moderation Panel (Moderation.jsx)

```javascript
import { useState, useEffect } from 'react';
import './Moderation.css';

function Moderation() {
  const [password, setPassword] = useState('');
  const [authenticated, setAuthenticated] = useState(false);
  const [reportedAnswers, setReportedAnswers] = useState([]);
  const [loading, setLoading] = useState(false);

  const login = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `http://localhost:3000/api/admin/reported-answers?password=${password}`
      );

      if (response.ok) {
        const data = await response.json();
        setReportedAnswers(data.answers);
        setAuthenticated(true);
      } else {
        alert('Invalid password');
      }
    } catch (error) {
      alert('Login error');
    } finally {
      setLoading(false);
    }
  };

  const approveAnswer = async (qaId) => {
    try {
      await fetch('http://localhost:3000/api/admin/approve-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, qaId })
      });

      setReportedAnswers(prev => prev.filter(qa => qa.id !== qaId));
      alert('Answer approved and restored');
    } catch (error) {
      alert('Error approving answer');
    }
  };

  const deleteAnswer = async (qaId) => {
    if (!confirm('Permanently delete this answer?')) return;

    try {
      await fetch('http://localhost:3000/api/admin/delete-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, qaId })
      });

      setReportedAnswers(prev => prev.filter(qa => qa.id !== qaId));
      alert('Answer deleted');
    } catch (error) {
      alert('Error deleting answer');
    }
  };

  if (!authenticated) {
    return (
      <div className="moderation-login">
        <h2>🔐 Admin Moderation Panel</h2>
        <input
          type="password"
          placeholder="Enter admin password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && login()}
        />
        <button onClick={login} disabled={loading}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </div>
    );
  }

  return (
    <div className="moderation-panel">
      <h2>📋 Reported Answers ({reportedAnswers.length})</h2>

      {reportedAnswers.length === 0 && (
        <p>No reported answers! 🎉</p>
      )}

      {reportedAnswers.map(qa => (
        <div key={qa.id} className="reported-item">
          <div className="report-header">
            <span className="report-count">🚩 {qa.reports} reports</span>
            <span className={`status ${qa.hidden ? 'hidden' : 'visible'}`}>
              {qa.hidden ? 'HIDDEN' : 'VISIBLE'}
            </span>
          </div>

          <div className="qa-content">
            <div className="question">
              <strong>Q:</strong> {qa.question}
            </div>
            <div className="answer">
              <strong>A:</strong> {qa.answer}
            </div>
          </div>

          <div className="qa-stats">
            👍 {qa.likes} | 👎 {qa.dislikes} | 
            Created: {new Date(qa.created_at).toLocaleString()}
          </div>

          <div className="moderation-actions">
            <button 
              className="approve-btn"
              onClick={() => approveAnswer(qa.id)}
            >
              ✅ Approve (False Report)
            </button>
            <button 
              className="delete-btn"
              onClick={() => deleteAnswer(qa.id)}
            >
              ❌ Delete (Incorrect)
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default Moderation;
```

---

## STEP 7: Add Moderation Panel to App.jsx

```javascript
import Moderation from './Moderation';

// Add state
const [showModeration, setShowModeration] = useState(false);

// Add button (near Train AI button)
<button className="toggle-moderation" onClick={() => setShowModeration(!showModeration)}>
  🛡️ Moderate
</button>

// Show moderation panel
if (showModeration) {
  return <Moderation />;
}
```

---

## 🎯 Testing Checklist:

1. ✅ Ask a question → should save to database
2. ✅ Click Like/Dislike → should update counts
3. ✅ Click Report 3 times → should auto-hide answer
4. ✅ Login to moderation panel → see reported answers
5. ✅ Approve answer → should unhide and reset reports
6. ✅ Delete answer → should remove permanently
7. ✅ Ask unknown question → should show Train AI suggestion

---

## 📝 Notes:

- Replace `http://localhost:3000` with your actual backend URL
- Set strong ADMIN_PASSWORD in production
- Consider adding rate limiting for reports
- Add user session tracking to prevent spam
- Consider email notifications for admin on reports

---

## 🚀 Deployment:

When deploying:
1. Update all `localhost:3000` to production URL
2. Set strong admin password
3. Enable RLS policies in Supabase
4. Add CORS settings
5. Test all features in production

---

**இது complete guide! படித்து implement செய்யுங்கள்! 🎯**
