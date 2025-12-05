import os
import asyncio
from dotenv import load_dotenv
from supabase import create_client, Client
import google.generativeai as genai
from pypdf import PdfReader
from langchain_text_splitters import RecursiveCharacterTextSplitter

# Load environment variables
load_dotenv()

# Configuration
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY")
GEMINI_API_KEY = os.getenv("GEMINI_API_KEY")

# Initialize clients
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
genai.configure(api_key=GEMINI_API_KEY)

PDF_PATH = "../Fundamentals of CNC Machining.pdf"

async def setup_database():
    """
    Sets up the database with the vector extension and documents table.
    """
    print("Setting up database...")
    
    # Enable vector extension
    try:
        # We can't easily run arbitrary SQL via the JS/Python client without a stored procedure 
        # or using the SQL editor in the dashboard. 
        # However, we can try to use the `rpc` call if a function exists, 
        # or just assume the user might need to run this in the dashboard if this fails.
        # For now, let's try to proceed. If the table doesn't exist, we might need the user 
        # to run a SQL snippet in their Supabase dashboard.
        pass 
    except Exception as e:
        print(f"Note: Ensure 'vector' extension is enabled in Supabase. Error: {e}")

    # Ideally, we would create the table here. 
    # Since the standard client limits DDL, we will print instructions if insertion fails.
    pass

def get_embedding(text):
    """Generates embedding using Gemini."""
    result = genai.embed_content(
        model="models/text-embedding-004",
        content=text,
        task_type="retrieval_document",
        title="CNC Knowledge"
    )
    return result['embedding']

async def process_pdf():
    print(f"Reading {PDF_PATH}...")
    reader = PdfReader(PDF_PATH)
    text = ""
    for page in reader.pages:
        text += page.extract_text() + "\n"
    
    print(f"Total characters: {len(text)}")

    # Split text into chunks
    text_splitter = RecursiveCharacterTextSplitter(
        chunk_size=1000,
        chunk_overlap=200,
        length_function=len,
    )
    chunks = text_splitter.split_text(text)
    print(f"Total chunks: {len(chunks)}")

    # Process and insert chunks
    print("Generating embeddings and storing in Supabase...")
    
    for i, chunk in enumerate(chunks):
        try:
            embedding = get_embedding(chunk)
            
            data = {
                "content": chunk,
                "metadata": {"source": "Fundamentals of CNC Machining.pdf", "chunk_index": i},
                "embedding": embedding
            }
            
            # Insert into 'documents' table
            response = supabase.table("documents").insert(data).execute()
            
            if i % 10 == 0:
                print(f"Processed {i}/{len(chunks)} chunks...")
                
        except Exception as e:
            print(f"Error processing chunk {i}: {e}")
            # If error is about table not found, we need to notify user
            if "relation \"documents\" does not exist" in str(e):
                print("\nCRITICAL: Table 'documents' does not exist.")
                return

    print("Ingestion complete!")

if __name__ == "__main__":
    asyncio.run(process_pdf())
