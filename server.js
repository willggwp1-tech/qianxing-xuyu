const express = require('express');
const path = require('path');
const { MongoClient } = require('mongodb');
const bcrypt = require('bcryptjs');

const app = express();
const PORT = process.env.PORT || 3000;

// Parse JSON request bodies
app.use(express.json());

// MongoDB connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb+srv://<username>:<password>@cluster0.m2qhior.mongodb.net/?retryWrites=true&w=majority';
let db;

async function connectDB() {
  try {
    const client = new MongoClient(MONGO_URI);
    await client.connect();
    db = client.db('starFragmentsDB');
    console.log('Connected to MongoDB Atlas — starFragmentsDB');

    // Ensure indexes for the users collection
    await db.collection('users').createIndex({ username: 1 }, { unique: true });
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

app.use(express.static(path.join(__dirname, 'public')));

app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'start.html'));
});

// --- Auth API ---

// Register
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({ error: '所有欄位皆為必填 All fields are required' });
    }
    if (username.length < 2 || username.length > 24) {
      return res.status(400).json({ error: '使用者名稱需 2-24 字元 Username must be 2-24 chars' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: '密碼至少 6 字元 Password must be at least 6 chars' });
    }

    // Check if user already exists
    const existing = await db.collection('users').findOne({
      $or: [{ username }, { email }]
    });
    if (existing) {
      return res.status(409).json({ error: '使用者名稱或信箱已存在 Username or email already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);
    const now = new Date();

    // Insert into users collection (matches existing schema)
    const user = {
      username,
      email,
      password: hashedPassword,
      createdAt: now,
      lastLogin: now,
      isActive: true
    };
    await db.collection('users').insertOne(user);

    // Also create a players entry for the star-fragments system
    await db.collection('players').insertOne({
      username,
      totalDonated: 0,
      totalReceived: 0,
      createdAt: now,
      updatedAt: now
    });

    res.status(201).json({ message: '註冊成功 Registered successfully' });
  } catch (err) {
    console.error('Register error:', err);
    res.status(500).json({ error: '伺服器錯誤 Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '請輸入使用者名稱和密碼 Username and password required' });
    }

    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(401).json({ error: '使用者名稱或密碼錯誤 Invalid username or password' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ error: '使用者名稱或密碼錯誤 Invalid username or password' });
    }

    // Update lastLogin
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLogin: new Date() } }
    );

    // Fetch player stats
    const player = await db.collection('players').findOne({ username: user.username });

    // Return user info (without password)
    res.json({
      message: '登入成功 Login successful',
      user: {
        username: user.username,
        email: user.email,
        isActive: user.isActive,
        totalDonated: player ? player.totalDonated : 0,
        totalReceived: player ? player.totalReceived : 0
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: '伺服器錯誤 Server error' });
  }
});

// --- Progress API ---

// Save progress
app.post('/api/progress/save', async (req, res) => {
  try {
    const { username, currentPage, dialogueIndex } = req.body;

    if (!username || !currentPage || dialogueIndex == null) {
      return res.status(400).json({ error: '缺少必要欄位 Missing required fields' });
    }

    // Validate currentPage is one of the known game pages
    const validPages = ['prologue.html', 'chapter1.html', 'chapter_select.html', 'prepare.html', 'chapter2.html', 'duel.html', 'soulweave_story.html', 'soulweave.html', 'chatbot.html', 'ending.html'];
    if (!validPages.includes(currentPage)) {
      return res.status(400).json({ error: '無效的頁面 Invalid page' });
    }

    // Verify user exists
    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(401).json({ error: '使用者不存在 User not found' });
    }

    await db.collection('progress').updateOne(
      { username },
      {
        $set: {
          currentPage,
          dialogueIndex: Number(dialogueIndex),
          updatedAt: new Date()
        },
        $setOnInsert: { createdAt: new Date() }
      },
      { upsert: true }
    );

    res.json({ message: '進度已儲存 Progress saved' });
  } catch (err) {
    console.error('Save progress error:', err);
    res.status(500).json({ error: '伺服器錯誤 Server error' });
  }
});

// Load progress
app.get('/api/progress/load', async (req, res) => {
  try {
    const { username } = req.query;

    if (!username) {
      return res.status(400).json({ error: '缺少使用者名稱 Missing username' });
    }

    const progress = await db.collection('progress').findOne({ username });

    if (!progress) {
      return res.json({ found: false });
    }

    res.json({
      found: true,
      currentPage: progress.currentPage,
      dialogueIndex: progress.dialogueIndex,
      updatedAt: progress.updatedAt
    });
  } catch (err) {
    console.error('Load progress error:', err);
    res.status(500).json({ error: '伺服器錯誤 Server error' });
  }
});

// --- Soul Weave Network API ---

// GET /api/network?username=xxx — ego-centric star map (me + connected players)
app.get('/api/network', async (req, res) => {
  try {
    const { username } = req.query;

    // Find the requesting user
    const me = username ? await db.collection('users').findOne({ username }) : null;
    const myId = me ? me._id.toString() : null;

    // Get all user_fragments with sourceType "received"
    const receivedFragments = await db.collection('user_fragments')
      .find({ sourceType: 'received' })
      .toArray();

    // Count activity per user and build link weights
    const activityCount = {};
    const linkMap = {};

    for (const frag of receivedFragments) {
      const recipientId = frag.userId?.toString();
      const donorId = frag.receivedFrom?.toString();
      if (!recipientId || !donorId) continue;

      activityCount[recipientId] = (activityCount[recipientId] || 0) + 1;
      activityCount[donorId] = (activityCount[donorId] || 0) + 1;

      const key = `${donorId}__${recipientId}`;
      linkMap[key] = (linkMap[key] || 0) + 1;
    }

    // Build links array
    const allLinks = Object.entries(linkMap).map(([key, weight]) => {
      const [source, target] = key.split('__');
      return { source, target, weight };
    });

    // Determine which user IDs are connected (appear in at least one link)
    const connectedIds = new Set();
    for (const l of allLinks) {
      connectedIds.add(l.source);
      connectedIds.add(l.target);
    }

    // If we have a logged-in user, filter to ego network (me + my neighbors)
    let relevantIds;
    let relevantLinks;
    if (myId) {
      // Find IDs directly connected to me
      const myNeighbors = new Set();
      for (const l of allLinks) {
        if (l.source === myId) myNeighbors.add(l.target);
        if (l.target === myId) myNeighbors.add(l.source);
      }
      myNeighbors.add(myId);
      relevantIds = myNeighbors;
      // Keep links where both endpoints are in my neighborhood
      relevantLinks = allLinks.filter(l => relevantIds.has(l.source) && relevantIds.has(l.target));
    } else {
      // No user — show only connected nodes
      relevantIds = connectedIds;
      relevantLinks = allLinks;
    }

    // Fetch only relevant users
    const users = await db.collection('users').find({}, { projection: { username: 1 } }).toArray();
    const userMap = {};
    for (const u of users) userMap[u._id.toString()] = u.username;

    // Sample inscriptions
    const sampleMessages = {};
    const publicFragments = await db.collection('public_fragments').find({}).toArray();
    const originalIds = [...new Set(publicFragments.map(f => f.originalId))];
    const originals = originalIds.length > 0
      ? await db.collection('fragment_originals').find({ originalId: { $in: originalIds } }).toArray()
      : [];
    const originalMap = {};
    for (const o of originals) originalMap[o.originalId] = o;
    for (const pf of publicFragments) {
      const uid = pf.donatedBy?.toString();
      if (uid && !sampleMessages[uid] && originalMap[pf.originalId]) {
        sampleMessages[uid] = originalMap[pf.originalId].inscription || '';
      }
    }

    // Build nodes (only connected / relevant users)
    const nodes = users
      .filter(u => relevantIds.has(u._id.toString()))
      .map(u => {
        const uid = u._id.toString();
        return {
          id: uid,
          name: u.username,
          activity: activityCount[uid] || 0,
          sampleMessage: sampleMessages[uid] || '',
          isMe: uid === myId
        };
      });

    res.json({ nodes, links: relevantLinks, myId });
  } catch (err) {
    console.error('Network API error:', err);
    res.status(500).json({ error: '伺服器錯誤 Server error' });
  }
});

// GET /api/comments — recent comments sorted by newest first
app.get('/api/comments', async (req, res) => {
  try {
    const comments = await db.collection('comments')
      .find({})
      .sort({ timestamp: -1 })
      .limit(100)
      .toArray();

    // Collect unique userIds and resolve usernames
    const userIds = [...new Set(comments.map(c => c.userId))];
    const users = userIds.length > 0
      ? await db.collection('users').find({ _id: { $in: userIds.map(id => {
          try { return new (require('mongodb').ObjectId)(id); } catch { return id; }
        }) } }).toArray()
      : [];
    const nameMap = {};
    for (const u of users) {
      nameMap[u._id.toString()] = u.username;
    }

    const result = comments.map(c => ({
      username: nameMap[c.userId] || c.userId,
      phrase: c.phrase,
      timestamp: c.timestamp
    }));

    res.json(result);
  } catch (err) {
    console.error('GET comments error:', err);
    res.status(500).json({ error: '伺服器錯誤 Server error' });
  }
});

// POST /api/comments — create a new comment
app.post('/api/comments', async (req, res) => {
  try {
    const { phrase, userId } = req.body;

    if (!phrase || typeof phrase !== 'string' || phrase.trim().length === 0) {
      return res.status(400).json({ error: '缺少留言內容 Phrase is required' });
    }
    if (!userId || typeof userId !== 'string') {
      return res.status(400).json({ error: '缺少使用者 userId is required' });
    }

    // Sanitize: limit phrase length
    const cleanPhrase = phrase.trim().slice(0, 200);

    const doc = {
      userId,
      phrase: cleanPhrase,
      words: cleanPhrase.split(' '),
      timestamp: new Date()
    };

    await db.collection('comments').insertOne(doc);
    res.status(201).json({ message: '留言成功 Comment posted' });
  } catch (err) {
    console.error('POST comments error:', err);
    res.status(500).json({ error: '伺服器錯誤 Server error' });
  }
});

// --- Soul Weave Story Completion API ---

// POST /api/soulweave-story/complete — mark story as completed
app.post('/api/soulweave-story/complete', async (req, res) => {
  try {
    const { username } = req.body;
    if (!username || typeof username !== 'string') {
      return res.status(400).json({ error: '缺少使用者名稱 Missing username' });
    }

    const user = await db.collection('users').findOne({ username });
    if (!user) {
      return res.status(401).json({ error: '使用者不存在 User not found' });
    }

    await db.collection('users').updateOne(
      { username },
      { $set: { soulweaveStoryDone: true } }
    );

    res.json({ message: '星憶劇情已完成 Story completed' });
  } catch (err) {
    console.error('Soulweave story complete error:', err);
    res.status(500).json({ error: '伺服器錯誤 Server error' });
  }
});

// GET /api/soulweave-story/status — check if story is completed
app.get('/api/soulweave-story/status', async (req, res) => {
  try {
    const { username } = req.query;
    if (!username) {
      return res.json({ completed: false });
    }

    const user = await db.collection('users').findOne({ username });
    res.json({ completed: !!(user && user.soulweaveStoryDone) });
  } catch (err) {
    console.error('Soulweave story status error:', err);
    res.status(500).json({ error: '伺服器錯誤 Server error' });
  }
});

// Start server after DB connection
connectDB().then(() => {
  app.listen(PORT, () => {
    console.log(`牽星絮語 server running at http://localhost:${PORT}`);
  });
});
