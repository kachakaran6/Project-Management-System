const { MongoClient } = require('mongodb');

async function debug() {
  const uri = "mongodb+srv://kachak331_db_user:txh3HlTyK4ecy3PL@cluster0.rihdwbv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    const db = client.db('test');
    
    const perms = await db.collection('rolepermissions').find({ role: 'ADMIN' }).toArray();
    console.log('ADMIN Permissions in DB:', perms.map(p => ({
        permission: p.permission,
        isActive: p.isActive,
        org: p.organizationId || 'GLOBAL'
    })));

  } finally {
    await client.close();
  }
}

debug().catch(console.error);
