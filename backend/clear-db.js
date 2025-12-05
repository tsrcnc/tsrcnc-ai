const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function clearDatabase() {
    console.log('Clearing all documents from database...');

    const { error } = await supabase
        .from('documents')
        .delete()
        .neq('id', 0); // Delete all rows

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('✅ Database cleared successfully!');
        console.log('Now run: node ingest.js to re-upload your PDF');
    }
}

clearDatabase();
