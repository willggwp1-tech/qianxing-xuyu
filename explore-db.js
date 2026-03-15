/**
 * MongoDB Atlas Database Explorer — starFragmentsDB
 * 
 * Usage:
 *   node explore-db.js <connection-string>
 *   MONGO_URI=<connection-string> node explore-db.js
 */

const { MongoClient } = require('mongodb');

async function main() {
  // Accept connection string from CLI arg or environment variable
  const uri = process.argv[2] || process.env.MONGO_URI;

  if (!uri) {
    console.error('Usage: node explore-db.js <mongodb-connection-string>');
    console.error('  or set MONGO_URI environment variable');
    process.exit(1);
  }

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to MongoDB Atlas successfully.\n');

    // List all databases
    const adminDb = client.db().admin();
    const { databases } = await adminDb.listDatabases();
    console.log('=== Databases ===');
    for (const db of databases) {
      console.log(`  - ${db.name} (${(db.sizeOnDisk / 1024).toFixed(1)} KB)`);
    }
    console.log();

    // For each non-system database, list collections and sample documents
    for (const dbInfo of databases) {
      if (['admin', 'local', 'config'].includes(dbInfo.name)) continue;

      const db = client.db(dbInfo.name);
      const collections = await db.listCollections().toArray();

      if (collections.length === 0) continue;

      console.log(`=== Database: ${dbInfo.name} ===`);
      console.log(`Collections (${collections.length}):`);

      for (const col of collections) {
        const collection = db.collection(col.name);
        const count = await collection.estimatedDocumentCount();
        console.log(`\n  --- ${col.name} (${count} documents) ---`);

        // Get a sample document
        const sample = await collection.findOne();
        if (sample) {
          console.log('  Sample document:');
          console.log(JSON.stringify(sample, null, 4).split('\n').map(l => '    ' + l).join('\n'));

          // Analyze schema from sample
          console.log('  Fields:');
          for (const [key, value] of Object.entries(sample)) {
            const type = Array.isArray(value) ? 'Array' : typeof value;
            console.log(`    - ${key}: ${type}`);
          }
        } else {
          console.log('  (empty collection)');
        }
      }
      console.log();
    }
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('Connection closed.');
  }
}

main();
