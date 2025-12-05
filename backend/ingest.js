const { GoogleGenerativeAI } = require('@google/generative-ai');
const { RecursiveCharacterTextSplitter } = require('@langchain/textsplitters');
const { createClient } = require('@supabase/supabase-js');
const pdf = require('pdf-parse');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

// Configuration
const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Initialize clients
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

// PDF PATH - இங்கே மாற்றவும்!
const PDF_PATH = path.join(__dirname, '../Fundamentals of CNC Machining.pdf');

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

async function processPdf() {
    console.log(`📄 Reading PDF: ${PDF_PATH}...`);

    if (!fs.existsSync(PDF_PATH)) {
        console.error("❌ Error: PDF file not found at", PDF_PATH);
        console.log("\n📝 How to use:");
        console.log("1. Copy your PDF file to the project folder");
        console.log("2. Update PDF_PATH in ingest.js (line 20)");
        console.log("3. Run: node ingest.js");
        return;
    }

    let data;
    try {
        const dataBuffer = fs.readFileSync(PDF_PATH);
        data = await pdf(dataBuffer);
        console.log(`✅ PDF loaded successfully!`);
        console.log(`📊 Total pages: ${data.numpages}`);
        console.log(`📝 Total characters: ${data.text.length}`);
    } catch (e) {
        console.error("❌ Error parsing PDF:", e);
        return;
    }

    const textContent = data.text;

    // Split into chunks (1000 characters for good balance)
    const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 1000,
        chunkOverlap: 100,
    });

    const chunks = await splitter.splitText(textContent);
    console.log(`📦 Split into ${chunks.length} chunks`);
    console.log('🔄 Generating embeddings and storing in Supabase...\n');

    let successCount = 0;
    let failCount = 0;

    for (let i = 0; i < chunks.length; i++) {
        const chunkContent = chunks[i];

        // Skip empty chunks
        if (!chunkContent.trim()) {
            console.log(`⏭️  Skipping empty chunk ${i + 1}`);
            continue;
        }

        const embedding = await getEmbedding(chunkContent);

        if (embedding) {
            const { error } = await supabase
                .from('documents')
                .insert({
                    content: chunkContent,
                    metadata: {
                        source: path.basename(PDF_PATH),
                        chunk_index: i,
                        total_chunks: chunks.length
                    },
                    embedding: embedding
                });

            if (error) {
                console.error(`❌ Error inserting chunk ${i + 1}:`, error.message);
                failCount++;
            } else {
                successCount++;
                if (successCount % 10 === 0) {
                    console.log(`✅ Processed ${successCount}/${chunks.length} chunks...`);
                }
            }
        } else {
            failCount++;
        }

        // Small delay to avoid rate limits
        await new Promise(resolve => setTimeout(resolve, 200));
    }

    console.log('\n📊 Ingestion Summary:');
    console.log(`✅ Success: ${successCount} chunks`);
    console.log(`❌ Failed: ${failCount} chunks`);
    console.log(`📈 Success rate: ${((successCount / chunks.length) * 100).toFixed(1)}%`);
    console.log('\n🎉 Ingestion complete!');
}

processPdf();
