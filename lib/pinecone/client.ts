import { Pinecone } from '@pinecone-database/pinecone';

// Validasi Environment Variable di awal (Fail-Fast principle)
const apiKey = process.env.PINECONE_API_KEY;

if (!apiKey) {
  throw new Error('PINECONE_API_KEY environment variable is missing.');
}

// Singleton Pattern untuk lingkungan Node.js / Edge
const globalForPinecone = globalThis as unknown as {
  pineconeClient: Pinecone | undefined;
};

// Menginisiasi koneksi utama ke infrastruktur Pinecone
export const pineconeClient =
  globalForPinecone.pineconeClient ??
  new Pinecone({
    apiKey,
  });

// Menyimpan instance ke memori global jika bukan di production
if (process.env.NODE_ENV !== 'production') {
  globalForPinecone.pineconeClient = pineconeClient;
}