require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { MongoClient } = require('mongodb');

async function resetDevData() {
  const mongoUri = process.env.MONGODB_URI;
  if (!mongoUri) {
    console.error('❌ MONGODB_URI environment variable is not set.');
    process.exit(1);
  }

  console.log('⚠️  WARNING: This will delete ALL development data from the database.');
  console.log('   Connecting to:', mongoUri.replace(/\/\/.+@/, '//<credentials>@'));
  console.log('');

  const client = new MongoClient(mongoUri, {
    connectTimeoutMS: 10000,
    serverSelectionTimeoutMS: 10000
  });

  try {
    await client.connect();
    const db = client.db();
    console.log('✅ Connected to MongoDB.\n');

    // Clear all collections
    const collections = [
      { name: 'users', label: 'Users' },
      { name: 'rooms', label: 'Rooms' },
      { name: 'drawings', label: 'Drawings' },
      { name: 'sticky_notes', label: 'Sticky Notes' },
      { name: 'chat_messages', label: 'Chat Messages' },
      { name: 'file_messages', label: 'File Messages' },
      { name: 'used_room_ids', label: 'Used Room IDs' },
    ];

    for (const { name, label } of collections) {
      const result = await db.collection(name).deleteMany({});
      console.log(`🗑️  Cleared ${label} collection: ${result.deletedCount} document(s) removed`);
    }

    console.log('');

    // Drop all indexes on users (to start fresh)
    const userIndexes = await db.collection('users').indexes();
    for (const idx of userIndexes) {
      if (idx.name !== '_id_') {
        await db.collection('users').dropIndex(idx.name);
        console.log(`📌 Dropped index: ${idx.name}`);
      }
    }

    // Create required indexes
    console.log('\n📌 Creating indexes...');
    await db.collection('users').createIndex({ email: 1 }, { unique: true });
    console.log('   ✅ Created unique index on users.email');

    await db.collection('rooms').createIndex({ roomId: 1 }, { unique: true, sparse: true });
    console.log('   ✅ Created sparse unique index on rooms.roomId');

    await db.collection('drawings').createIndex({ room_id: 1, created_at: 1 });
    console.log('   ✅ Created index on drawings (room_id, created_at)');

    await db.collection('sticky_notes').createIndex({ room_id: 1 });
    console.log('   ✅ Created index on sticky_notes (room_id)');

    await db.collection('chat_messages').createIndex({ room_id: 1, created_at: -1 });
    console.log('   ✅ Created index on chat_messages (room_id, created_at)');

    await db.collection('used_room_ids').createIndex({ roomId: 1 }, { unique: true });
    console.log('   ✅ Created unique index on used_room_ids.roomId');

    console.log('\n✅ All development data has been reset successfully!');
    console.log('   The database is now clean and ready for the new email-based auth schema.');
    console.log('   You can now restart the server and create new users.');
  } catch (err) {
    console.error('❌ Error during reset:', err.message);
    process.exit(1);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB.');
  }
}

resetDevData();
