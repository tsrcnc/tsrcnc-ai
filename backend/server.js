const express = require('express');
const cors = require('cors');
const multer = require('multer');
const { createClient } = require('@supabase/supabase-js');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const OpenAI = require('openai');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const openai = new OpenAI({ apiKey: OPENAI_API_KEY });

// Response cache
const responseCache = new Map();

// File upload setup
const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 50 * 1024 * 1024 }
});

// Helper functions
async function getEmbedding(text) {
    const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
    const result = await model.embedContent(text);
    return result.embedding.values;
}

async function searchDocuments(query, matchCount = 3) {
    const embedding = await getEmbedding(query);

    const { data, error } = await supabase.rpc('match_documents', {
        query_embedding: embedding,
        match_threshold: 0.3,
        match_count: matchCount
    });

    if (error) {
        console.error('Search error:', error);
        return [];
    }

    return data;
}

async function generateAnswer(query, context) {
    const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
            {
                role: "system",
                content: `You are a CNC machining expert assistant.

⚠️ ABSOLUTE CRITICAL RULE - ZERO TOLERANCE FOR HALLUCINATION:
You MUST ONLY provide information that is EXPLICITLY STATED in the provided context.

LANGUAGE:
- Tamil question → Tamil answer
- English question → English answer

If you don't have the information → Clearly state what's missing`
            },
            {
                role: "user",
                content: `Available Technical Data:\n\n${context}\n\nUser Question: ${query}\n\nCRITICAL: Only answer if the specific information is present.`
            }
        ],
        temperature: 0.3,
        max_tokens: 800
    });

    return completion.choices[0].message.content;
}

// CHAT ENDPOINT (with Q&A tracking and conversation memory)
app.post('/api/chat', async (req, res) => {
    try {
        const { message, history } = req.body; // Accept history

        if (!message) {
            return res.status(400).json({ error: 'Message is required' });
        }

        const cacheKey = message.toLowerCase().trim();

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
            // Build messages with conversation history
            const messages = [
                {
                    role: "system",
                    content: `You are a CNC machining expert assistant with conversation memory.

⚠️ CRITICAL RULES:
1. ONLY provide information EXPLICITLY in the provided context
2. Remember conversation history - answer follow-up questions
3. If user says "அதற்கு" or "that" or "it", refer to previous topic

LANGUAGE:
- Tamil → Tamil answer
- English → English answer

Available Data:
${context}`
                }
            ];

            // Add conversation history (last 6 messages)
            if (history && history.length > 0) {
                const recentHistory = history.slice(-6).map(msg => ({
                    role: msg.role === 'ai' ? 'assistant' : 'user',
                    content: msg.content
                }));
                messages.push(...recentHistory);
            }

            const completion = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: messages,
                temperature: 0.3,
                max_tokens: 800
            });

            answer = completion.choices[0].message.content;
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
        const { qaId, type } = req.body;

        if (!qaId || !type) {
            return res.status(400).json({ error: 'Missing parameters' });
        }

        const { data: qa } = await supabase
            .from('qa_interactions')
            .select('likes, dislikes')
            .eq('id', qaId)
            .single();

        if (!qa) {
            return res.status(404).json({ error: 'Q&A not found' });
        }

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

        const { data: qa } = await supabase
            .from('qa_interactions')
            .select('reports')
            .eq('id', qaId)
            .single();

        const newReportCount = (qa?.reports || 0) + 1;
        const shouldHide = newReportCount >= 3;

        await supabase
            .from('qa_interactions')
            .update({
                reports: newReportCount,
                hidden: shouldHide
            })
            .eq('id', qaId);

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

// TEXT CONTENT UPLOAD
app.post('/api/upload-text', async (req, res) => {
    try {
        const { content, title } = req.body;

        if (!content || !content.trim()) {
            return res.status(400).json({ error: 'Content is required' });
        }

        const textTitle = title || 'Manual Entry';
        console.log(`✍️ Processing text content: ${textTitle}`);

        const splitter = new RecursiveCharacterTextSplitter({
            chunkSize: 1000,
            chunkOverlap: 100,
        });

        const chunks = await splitter.splitText(content);
        console.log(`📦 Split into ${chunks.length} chunks`);

        let successCount = 0;
        let failCount = 0;

        for (let i = 0; i < chunks.length; i++) {
            const chunkContent = chunks[i];

            if (!chunkContent.trim()) continue;

            try {
                const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
                const result = await model.embedContent(chunkContent);
                const embedding = result.embedding.values;

                const { error } = await supabase
                    .from('documents')
                    .insert({
                        content: chunkContent,
                        metadata: {
                            source: textTitle,
                            type: 'manual_text',
                            chunk_index: i,
                            total_chunks: chunks.length,
                            uploaded_at: new Date().toISOString()
                        },
                        embedding: embedding
                    });

                if (error) {
                    failCount++;
                } else {
                    successCount++;
                }
            } catch (error) {
                console.error(`Error processing chunk ${i + 1}:`, error.message);
                failCount++;
            }

            await new Promise(resolve => setTimeout(resolve, 200));
        }

        responseCache.clear();

        res.json({
            success: true,
            message: `Text content uploaded successfully!`,
            stats: {
                title: textTitle,
                chunks: chunks.length,
                successCount,
                failCount,
                successRate: `${((successCount / chunks.length) * 100).toFixed(1)}%`
            }
        });

    } catch (error) {
        console.error('Text upload error:', error);
        res.status(500).json({ error: 'Failed to process text: ' + error.message });
    }
});

// GET STATS
app.get('/api/stats', async (req, res) => {
    try {
        const { count } = await supabase
            .from('documents')
            .select('*', { count: 'exact', head: true });

        res.json({
            totalChunks: count || 0,
            cacheSize: responseCache.size
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// ADMIN: GET REPORTED ANSWERS
app.get('/api/admin/reported-answers', async (req, res) => {
    try {
        const { password } = req.query;

        if (password !== ADMIN_PASSWORD) {
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

// ADMIN: APPROVE ANSWER
app.post('/api/admin/approve-answer', async (req, res) => {
    try {
        const { password, qaId } = req.body;

        if (password !== ADMIN_PASSWORD) {
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

// ADMIN: DELETE ANSWER
app.post('/api/admin/delete-answer', async (req, res) => {
    try {
        const { password, qaId } = req.body;

        if (password !== ADMIN_PASSWORD) {
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

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 CNC AI Assistant Server running on port ${PORT}`);
    console.log(`💡 Using GPT-4o-mini with response caching`);
    console.log(`✅ Q&A tracking ENABLED`);
    console.log(`🛡️ Admin moderation panel ready`);
});
