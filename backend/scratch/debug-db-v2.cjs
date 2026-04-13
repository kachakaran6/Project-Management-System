const { MongoClient, ObjectId } = require('mongodb');

async function debug() {
  const uri = "mongodb+srv://kachak331_db_user:txh3HlTyK4ecy3PL@cluster0.rihdwbv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected');
    
    const db = client.db('test');
    const cols = await db.listCollections().toArray();
    console.log('Collections in "test":', cols.map(c => c.name));

    const user = await db.collection('users').findOne({ email: 'kachakaran06@gmail.com' });
    if (user) {
        console.log('User:', { id: user._id, role: user.role });
        const members = await db.collection('organizationmembers').find({ userId: user._id }).toArray();
        console.log('Memberships:', members.map(m => ({ orgId: m.organizationId, role: m.role })));
    } else {
        console.log('User NOT found in "test"');
    }

  } finally {
    await client.close();
  }
}

debug().catch(console.error);
