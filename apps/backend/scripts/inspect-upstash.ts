import 'dotenv/config';
import { Search } from '@upstash/search';

const searchClient = new Search({
  url: process.env.UPSTASH_SEARCH_REST_URL!,
  token: process.env.UPSTASH_SEARCH_REST_TOKEN!,
});

async function inspectDocuments() {
  console.log('Inspecting Upstash Document Structure');
  console.log('='.repeat(70));
  
  // Get list of indexes with document counts
  const indexes = await searchClient.listIndexes();
  console.log('\nAll indexes with document counts:');
  
  for (const indexName of indexes) {
    const index = searchClient.index(indexName);
    const info = await index.info();
    if (info.documentCount > 0) {
      console.log(`  - ${indexName}: ${info.documentCount} docs`);
    }
  }
  
  // Inspect a few indexes in detail
  const samplesToInspect = ['strength-training', 'hypertrophy', 'squat-technique', 'nutrition'];
  
  for (const indexName of samplesToInspect) {
    console.log(`\n${'='.repeat(70)}`);
    console.log(`INDEX: ${indexName}`);
    console.log('='.repeat(70));
    
    const index = searchClient.index(indexName);
    
    // Search to get some documents
    const results = await index.search({
      query: 'training exercise form',
      limit: 2,
    });
    
    for (const doc of results) {
      console.log(`\n--- Document ---`);
      console.log(`ID: ${doc.id}`);
      console.log(`Score: ${doc.score}`);
      console.log(`\nContent (type: ${typeof doc.content}):`);
      console.log(JSON.stringify(doc.content, null, 2));
      console.log(`\nMetadata (type: ${typeof doc.metadata}):`);
      console.log(JSON.stringify(doc.metadata, null, 2));
    }
  }
}

inspectDocuments().catch(console.error);

