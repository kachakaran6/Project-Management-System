const { MongoClient } = require('mongodb');

async function debug() {
  const uri = "mongodb+srv://kachak331_db_user:txh3HlTyK4ecy3PL@cluster0.rihdwbv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');
    
    const p = await db.collection('rolepermissions').findOne({ role: 'ADMIN', permission: 'INVITE_USER' });
    console.log('Permission Record:', p);

  } finally {
    await client.close();
  }
}

debug().catch(console.error);
