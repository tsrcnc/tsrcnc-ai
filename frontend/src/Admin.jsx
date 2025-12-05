import { useState, useEffect } from 'react'
import './Admin.css'

function Admin() {
    const [stats, setStats] = useState({ totalChunks: 0, cacheSize: 0 });
    const [uploading, setUploading] = useState(false);
    const [message, setMessage] = useState('');

    // Text upload state
    const [textContent, setTextContent] = useState('');
    const [textTitle, setTextTitle] = useState('');

    useEffect(() => {
        fetchStats();
    }, []);

    const fetchStats = async () => {
        try {
            const response = await fetch('http://localhost:3000/api/stats');
            const data = await response.json();
            setStats(data);
        } catch (error) {
            console.error('Error fetching stats:', error);
        }
    };

    const handleTextUpload = async () => {
        if (!textContent.trim()) {
            setMessage('❌ Please enter some content');
            return;
        }

        setUploading(true);
        setMessage('📤 Processing content...');

        try {
            const response = await fetch('http://localhost:3000/api/upload-text', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    content: textContent,
                    title: textTitle || 'Manual Entry'
                })
            });

            const data = await response.json();

            if (data.success) {
                setMessage(`✅ Success! Processed ${data.stats.successCount}/${data.stats.chunks} chunks (${data.stats.successRate})`);
                setTextContent('');
                setTextTitle('');
                fetchStats();
            } else {
                setMessage('❌ Upload failed');
            }
        } catch (error) {
            setMessage('❌ Error: ' + error.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="admin-container">
            <div className="admin-header">
                <h1>🔧 CNC AI - Add Knowledge</h1>
                <p>Add CNC technical content to expand the AI's knowledge base</p>
            </div>

            <div className="stats-card">
                <h3>📊 Current Statistics</h3>
                <div className="stats-grid">
                    <div className="stat-item">
                        <div className="stat-value">{stats.totalChunks}</div>
                        <div className="stat-label">Knowledge Chunks</div>
                    </div>
                    <div className="stat-item">
                        <div className="stat-value">{stats.cacheSize}</div>
                        <div className="stat-label">Cached Questions</div>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`message ${message.includes('✅') ? 'success' : 'error'}`}>
                    {message}
                </div>
            )}

            <div className="upload-section">
                <h3>✍️ Add Content</h3>
                <p className="section-desc">
                    Paste G-code examples, turning cycles, thread data, or any CNC technical content.
                    You can paste multiple topics at once - they'll be automatically separated!
                </p>

                <input
                    type="text"
                    className="text-title-input"
                    placeholder="📌 Title / Topic (e.g., G71 Turning Cycle, M20 Thread Specs)"
                    value={textTitle}
                    onChange={(e) => setTextTitle(e.target.value)}
                    disabled={uploading}
                />

                <textarea
                    className="text-content-input"
                    placeholder="📝 Paste your content here...

✅ You can paste ONE topic or MULTIPLE topics - both work perfectly!

Example 1 (Single Topic):
━━━━━━━━━━━━━━━━━━━━
G71 Turning Cycle
==================
G71 is used for rough turning operations.

Format: G71 U(d) R(e)
Where:
- U(d): Depth of cut
- R(e): Retract amount
...

Example 2 (Multiple Topics):
━━━━━━━━━━━━━━━━━━━━
G71 Rough Turning
=================
G71 removes material in multiple passes...

G70 Finish Cycle  
================
G70 is the finishing cycle...

G76 Threading
=============
G76 cuts threads with controlled depth...

💡 TIP: The AI automatically chunks and organizes everything!"
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                    disabled={uploading}
                    rows={18}
                />

                <button
                    className="upload-text-btn"
                    onClick={handleTextUpload}
                    disabled={uploading || !textContent.trim()}
                >
                    {uploading ? '⏳ Processing & Saving...' : '📤 Add to Knowledge Base'}
                </button>
            </div>

            <div className="tips-section">
                <h3>💡 How It Works</h3>
                <ul>
                    <li><strong>Single Topic:</strong> Perfect for focused content like "G71 Cycle"</li>
                    <li><strong>Multiple Topics:</strong> Paste 5-6 topics together - AI auto-separates!</li>
                    <li><strong>Smart Chunking:</strong> Content is intelligently split into searchable pieces</li>
                    <li><strong>Context Preserved:</strong> Related information stays together</li>
                    <li><strong>Instant Updates:</strong> New content available immediately after upload</li>
                </ul>
            </div>

            <div className="examples-section">
                <h3>📋 What You Can Add</h3>
                <div className="examples-grid">
                    <div className="example-card">
                        <div className="example-icon">🔄</div>
                        <div className="example-title">G-Code Cycles</div>
                        <div className="example-text">G71, G72, G73, G74, G75, G76, etc.</div>
                    </div>
                    <div className="example-card">
                        <div className="example-icon">🔩</div>
                        <div className="example-title">Thread Data</div>
                        <div className="example-text">M series, pitch, drill sizes, etc.</div>
                    </div>
                    <div className="example-card">
                        <div className="example-icon">🛠️</div>
                        <div className="example-title">Tool Info</div>
                        <div className="example-text">Speeds, feeds, geometries, materials</div>
                    </div>
                    <div className="example-card">
                        <div className="example-icon">📐</div>
                        <div className="example-title">Calculations</div>
                        <div className="example-text">Taper, radius, offset formulas</div>
                    </div>
                </div>
            </div>
        </div>
    )
}

export default Admin
