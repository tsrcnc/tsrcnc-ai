# CNC AI Assistant

A powerful AI-powered CNC machining assistant with RAG (Retrieval-Augmented Generation) technology.

## Features

✅ **Smart Q&A System** - Ask anything about CNC machining, threads, tools, G-code
✅ **Conversation Memory** - Remembers context for follow-up questions
✅ **Train AI** - Community-driven knowledge base
✅ **Quality Control** - Like/Dislike/Report system with admin moderation
✅ **Multilingual** - Tamil & English support
✅ **Cost Optimized** - Uses GPT-4o-mini with response caching
✅ **Mobile Friendly** - Responsive design with floating action button

## Tech Stack

- **Frontend**: React + Vite
- **Backend**: Node.js + Express
- **Database**: Supabase (PostgreSQL + Vector Search)
- **AI Models**: 
  - OpenAI GPT-4o-mini (text generation)
  - Google Gemini (embeddings)
- **Features**: RAG, Vector Search, Conversation Memory

## Setup

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key
- Google Gemini API key

### Installation

1. Clone repository:
```bash
git clone <your-repo-url>
cd tsrcnc-ai
```

2. Install dependencies:
```bash
# Backend
cd backend
npm install

# Frontend
cd ../frontend
npm install
```

3. Setup environment variables:

Create `backend/.env`:
```env
GEMINI_API_KEY=your_gemini_key
SUPABASE_URL=your_supabase_url
SUPABASE_SERVICE_KEY=your_supabase_key
OPENAI_API_KEY=your_openai_key
ADMIN_PASSWORD=your_secure_password
```

4. Setup database (run SQL in Supabase):
See `backend/setup-qa-tables.sql`

5. Run development servers:
```bash
# Backend (terminal 1)
cd backend
node server.js

# Frontend (terminal 2)
cd frontend
npm run dev
```

## Usage

1. **Chat**: Ask questions about CNC machining
2. **Train AI**: Click floating + button → Train AI → Paste content
3. **Moderate**: Click + button → Moderate → Login with admin password
4. **Rate Answers**: Like/Dislike/Report buttons below each answer

## Admin Password

Default: `CNC_Admin_2024_Secure!` (change in production!)

## Deployment

See `DEPLOYMENT_GUIDE.md` for production deployment instructions.

## Cost

With GPT-4o-mini and caching:
- ~$0.0015 per question
- $10 = 6000+ questions

## License

MIT

## Author

TSRCNC AI Team
