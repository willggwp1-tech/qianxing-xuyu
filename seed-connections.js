/**
 * Seed sample connection data for Soul Weave visualization.
 * Creates test users and user_fragments (sourceType: "received")
 * so the star map shows an ego-centric network.
 *
 * Usage:
 *   node seed-connections.js
 *
 * Assumes MONGO_URI is set or uses the default connection string from server.js.
 */

const { MongoClient, ObjectId } = require('mongodb');

const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://<username>:<password>@cluster0.m2qhior.mongodb.net/?retryWrites=true&w=majority';

async function main() {
  const client = new MongoClient(MONGO_URI);

  try {
    await client.connect();
    const db = client.db('starFragmentsDB');
    console.log('Connected to MongoDB Atlas — starFragmentsDB');

    // 1. Get existing users
    const existingUsers = await db.collection('users').find({}).toArray();
    console.log(`Found ${existingUsers.length} existing user(s).`);

    // If fewer than 6 users, create sample users (no password — display only)
    const sampleNames = ['星河旅人', '月光守者', '晨曦使者', '夜風語者', '極光觀測者'];
    const usersToInsert = [];

    for (const name of sampleNames) {
      const exists = existingUsers.find(u => u.username === name);
      if (!exists) {
        usersToInsert.push({
          username: name,
          email: `${name}@sample.local`,
          password: '---sample---',
          createdAt: new Date(),
          isSample: true
        });
      }
    }

    if (usersToInsert.length > 0) {
      await db.collection('users').insertMany(usersToInsert);
      console.log(`Inserted ${usersToInsert.length} sample users.`);
    }

    // Re-fetch all users
    const allUsers = await db.collection('users').find({}).toArray();
    console.log(`Total users: ${allUsers.length}`);

    if (allUsers.length < 2) {
      console.log('Need at least 2 users to create connections. Exiting.');
      return;
    }

    // Pick the first non-sample user as "me" (the player), fallback to first user
    const me = allUsers.find(u => !u.isSample) || allUsers[0];
    const others = allUsers.filter(u => u._id.toString() !== me._id.toString());

    console.log(`"Me" user: ${me.username} (${me._id})`);

    // 2. Create user_fragments connections
    //    Each fragment = a "received" record linking donor → recipient
    const fragments = [];

    // Me ↔ each sample user (bidirectional help)
    for (const other of others.slice(0, 5)) {
      // other helped me
      fragments.push({
        userId: me._id.toString(),
        sourceType: 'received',
        receivedFrom: other._id,
        fragmentType: 'encouragement',
        createdAt: new Date(Date.now() - Math.random() * 7 * 86400000)
      });
      // me helped other
      fragments.push({
        userId: other._id.toString(),
        sourceType: 'received',
        receivedFrom: me._id,
        fragmentType: 'encouragement',
        createdAt: new Date(Date.now() - Math.random() * 7 * 86400000)
      });
    }

    // Some inter-connections among sample users (so the graph isn't purely star-shaped)
    if (others.length >= 3) {
      // user[0] ↔ user[1]
      fragments.push({
        userId: others[0]._id.toString(),
        sourceType: 'received',
        receivedFrom: others[1]._id,
        fragmentType: 'praise',
        createdAt: new Date(Date.now() - Math.random() * 5 * 86400000)
      });
      fragments.push({
        userId: others[1]._id.toString(),
        sourceType: 'received',
        receivedFrom: others[0]._id,
        fragmentType: 'praise',
        createdAt: new Date(Date.now() - Math.random() * 5 * 86400000)
      });

      // user[1] ↔ user[2]
      fragments.push({
        userId: others[1]._id.toString(),
        sourceType: 'received',
        receivedFrom: others[2]._id,
        fragmentType: 'support',
        createdAt: new Date(Date.now() - Math.random() * 5 * 86400000)
      });
      fragments.push({
        userId: others[2]._id.toString(),
        sourceType: 'received',
        receivedFrom: others[1]._id,
        fragmentType: 'support',
        createdAt: new Date(Date.now() - Math.random() * 5 * 86400000)
      });
    }

    // Add extra fragments to make some links heavier (multiple helps)
    if (others.length >= 2) {
      for (let i = 0; i < 3; i++) {
        fragments.push({
          userId: me._id.toString(),
          sourceType: 'received',
          receivedFrom: others[0]._id,
          fragmentType: 'encouragement',
          createdAt: new Date(Date.now() - Math.random() * 3 * 86400000)
        });
      }
    }

    // Clear old sample fragments and insert new ones
    await db.collection('user_fragments').deleteMany({ fragmentType: { $in: ['encouragement', 'praise', 'support'] } });
    const result = await db.collection('user_fragments').insertMany(fragments);
    console.log(`Inserted ${result.insertedCount} connection fragments.`);

    // Summary
    console.log('\n--- Network preview ---');
    console.log(`Center node: ${me.username}`);
    console.log(`Connected neighbors: ${others.slice(0, 5).map(u => u.username).join(', ')}`);
    console.log(`Total fragments: ${fragments.length}`);
    console.log('\nDone! Restart the server and visit soulweave.html to see the ego-centric star map.');

  } catch (err) {
    console.error('Error:', err.message);
  } finally {
    await client.close();
  }
}

main();
