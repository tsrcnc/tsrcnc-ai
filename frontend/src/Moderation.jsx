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
                `${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/reported-answers?password=${encodeURIComponent(password)}`
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
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/approve-answer`, {
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
            await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3000'}/api/admin/delete-answer`, {
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
                <div className="login-box">
                    <h2>🔐 Admin Moderation Panel</h2>
                    <p>Enter admin password to review reported content</p>
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
            </div>
        );
    }

    return (
        <div className="moderation-panel">
            <div className="moderation-header">
                <h2>📋 Reported Answers</h2>
                <span className="report-count">{reportedAnswers.length} items</span>
            </div>

            {reportedAnswers.length === 0 && (
                <div className="no-reports">
                    <h3>🎉 No Reported Answers!</h3>
                    <p>Everything looks good. No content to review.</p>
                </div>
            )}

            {reportedAnswers.map(qa => (
                <div key={qa.id} className="reported-item">
                    <div className="report-header">
                        <span className="report-count">🚩 {qa.reports} reports</span>
                        <span className={`status ${qa.hidden ? 'hidden' : 'visible'}`}>
                            {qa.hidden ? '👁️‍🗨️ HIDDEN' : '👁️ VISIBLE'}
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
                        📅 {new Date(qa.created_at).toLocaleString()}
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
