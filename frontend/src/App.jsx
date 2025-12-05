import { useState, useEffect, useRef } from 'react'
import ReactMarkdown from 'react-markdown'
import Admin from './Admin'
import Moderation from './Moderation'
import './App.css'

function App() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showModeration, setShowModeration] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const messagesEndRef = useRef(null);
  const messagesContainerRef = useRef(null); // Container reference

  // Smart auto-scroll: show top of new message
  useEffect(() => {
    if (messagesContainerRef.current) {
      const container = messagesContainerRef.current;
      const scrollHeight = container.scrollHeight;
      const clientHeight = container.clientHeight;

      // Only scroll if we're near the bottom (within 100px)
      const isNearBottom = scrollHeight - container.scrollTop - clientHeight < 100;

      if (isNearBottom || loading) {
        // Smooth scroll to bottom when loading or when user is at bottom
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }
    }
  }, [messages, loading]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Build conversation history
      const conversationHistory = [...messages, userMessage].map(msg => ({
        role: msg.role,
        content: msg.content
      }));

      const response = await fetch('http://localhost:3000/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: input,
          history: conversationHistory.slice(-10) // Last 10 messages for context
        })
      });

      const data = await response.json();
      const aiMessage = {
        role: 'ai',
        content: data.answer,
        cached: data.cached,
        qaId: data.qaId,
        noData: data.noData
      };
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('Error:', error);
      const errorMessage = { role: 'ai', content: 'Sorry, something went wrong.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const rateAnswer = async (qaId, type) => {
    try {
      await fetch('http://localhost:3000/api/rate-answer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qaId, type })
      });
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

  if (showModeration) {
    return (
      <>
        <button className="toggle-admin" onClick={() => setShowModeration(false)}>
          💬 Back to Chat
        </button>
        <Moderation />
      </>
    );
  }

  if (showAdmin) {
    return (
      <>
        <button className="toggle-admin" onClick={() => setShowAdmin(false)}>
          💬 Back to Chat
        </button>
        <Admin />
      </>
    );
  }

  return (
    <div className="app">
      {/* Floating Action Button */}
      <div className="floating-menu">
        {menuOpen && (
          <div className="menu-items">
            <button
              className="menu-item train-btn"
              onClick={() => {
                setShowAdmin(true);
                setMenuOpen(false);
              }}
            >
              <span className="icon">🎓</span>
              <span className="label">Train AI</span>
            </button>
            <button
              className="menu-item moderate-btn"
              onClick={() => {
                setShowModeration(true);
                setMenuOpen(false);
              }}
            >
              <span className="icon">🛡️</span>
              <span className="label">Moderate</span>
            </button>
          </div>
        )}

        <button
          className={`fab-button ${menuOpen ? 'open' : ''}`}
          onClick={() => setMenuOpen(!menuOpen)}
        >
          {menuOpen ? '✕' : '+'}
        </button>
      </div>

      <div className="chat-container">
        <div className="header">
          <h1>🔧 CNC AI Assistant</h1>
          <p>Your expert guide for CNC machining</p>
        </div>

        <div className="messages" ref={messagesContainerRef}>
          {messages.length === 0 && (
            <div className="welcome">
              <h2>Welcome! 👋</h2>
              <p>Ask me anything about CNC machining, thread sizes, tooling, or G-code!</p>
              <div className="suggestions">
                <button onClick={() => setInput('What is the drill size for M8 thread?')}>
                  M8 thread drill size?
                </button>
                <button onClick={() => setInput('Give me G76 example program for M10x1.5')}>
                  G76 threading example?
                </button>
              </div>
            </div>
          )}

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
                    {!msg.cached && !msg.noData && (
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

          {loading && (
            <div className="message ai">
              <div className="message-content loading">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {/* Auto-scroll anchor */}
          <div ref={messagesEndRef} />
        </div>

        <form className="input-form" onSubmit={sendMessage}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about CNC machining..."
            disabled={loading}
          />
          <button type="submit" disabled={loading || !input.trim()}>
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default App
