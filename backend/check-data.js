const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_KEY);

async function checkData() {
    const { data, error } = await supabase
        .from('documents')
        .select('content, metadata')
        .limit(5);

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Sample data from database:');
        data.forEach((doc, i) => {
            console.log(`\n--- Chunk ${i + 1} ---`);
            console.log('Metadata:', doc.metadata);
            console.log('Content preview:', doc.content.substring(0, 300));
        });
    }
}

checkData();
