const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// ... rest of the imports
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

const DATA_PATH = path.join(__dirname, '../complete_metric_threads.md');

async function getEmbedding(text, retries = 5) {
    for (let i = 0; i < retries; i++) {
        try {
            const result = await model.embedContent(text);
            return result.embedding.values;
        } catch (error) {
            if (error.status === 429 || error.message?.includes('429')) {
                const delay = Math.min(1000 * Math.pow(2, i), 20000);
                console.log(`Rate limit hit. Retrying in ${delay}ms...`);
                await new Promise(resolve => setTimeout(resolve, delay));
            } else {
                console.error("Error generating embedding:", error.message);
                return null;
            }
        }
    }
    console.error("Max retries reached for embedding.");
    return null;
}

async function processMarkdownFile() {
    console.log(`Reading ${DATA_PATH}...`);

    if (!fs.existsSync(DATA_PATH)) {
        console.error("Error: File not found at", DATA_PATH);
        return;
    }

    const textContent = fs.readFileSync(DATA_PATH, 'utf-8');
    console.log(`Total characters: ${textContent.length}`);

    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100,
    });

    const chunks = await splitter.splitText(textContent);
    console.log(`Total chunks: ${chunks.length}`);
    console.log('Generating embeddings and storing in Supabase...');

    for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];
        const embedding = await getEmbedding(chunkContent);

        if (embedding) {
            const { error } = await supabase
                .from('documents')
                .insert({
                    content: chunkContent,
                    metadata: { source: "metric_thread_specs.md", chunk_index: i },
                    embedding: embedding
                });

            if (error) {
                console.error(`Error inserting chunk ${i}:`, error);
            } else {
                console.log(`Processed ${i + 1}/${chunks.length} chunks...`);
            }
        }
    }

    console.log('Ingestion complete!');
}

processMarkdownFile();
