/**
 * Seed sample comments into the comments collection.
 *
 * Usage:
 *   node seed-comments.js <connection-string>
 *   MONGO_URI=<connection-string> node seed-comments.js
 */

const { MongoClient } = require('mongodb');

const SAMPLE_COMMENTS = [
  { userId: 'guest', phrase: '我 祝福 你',       words: ['我', '祝福', '你'] },
  { userId: 'guest', phrase: '我們 陪伴 彼此',   words: ['我們', '陪伴', '彼此'] },
  { userId: 'guest', phrase: '星辰 守護 世界',   words: ['星辰', '守護', '世界'] },
  { userId: 'guest', phrase: '大家 感謝 彼此',   words: ['大家', '感謝', '彼此'] },
  { userId: 'guest', phrase: '命運 牽引 我們',   words: ['命運', '牽引', '我們'] },
  { userId: 'guest', phrase: '我 希望 未來',     words: ['我', '希望', '未來'] },
  { userId: 'guest', phrase: '你 守護 星空',     words: ['你', '守護', '星空'] },
  { userId: 'guest', phrase: '我們 祝福 世界',   words: ['我們', '祝福', '世界'] },
  { userId: 'guest', phrase: '星辰 陪伴 我',     words: ['星辰', '陪伴', '我'] },
  { userId: 'guest', phrase: '大家 希望 未來',   words: ['大家', '希望', '未來'] },
  { userId: 'guest', phrase: '命運 感謝 彼此',   words: ['命運', '感謝', '彼此'] },
  { userId: 'guest', phrase: '我 牽引 星空',     words: ['我', '牽引', '星空'] },
];

async function main() {
  const uri = process.argv[2] || process.env.MONGO_URI;
  if (!uri) {
    console.error('Usage: node seed-comments.js <mongodb-connection-string>');
    console.error('  or set MONGO_URI environment variable');
    process.exit(1);
  }

  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db('starFragmentsDB');
    const col = db.collection('comments');

    // Add staggered timestamps so they look natural
    const now = Date.now();
    const docs = SAMPLE_COMMENTS.map((c, i) => ({
      ...c,
      timestamp: new Date(now - i * 3 * 60 * 1000) // each 3 minutes apart
    }));

    const result = await col.insertMany(docs);
    console.log(`Inserted ${result.insertedCount} sample comments into starFragmentsDB.comments`);
  } finally {
    await client.close();
  }
}

main().catch(err => {
  console.error('Error:', err.message);
  process.exit(1);
});
