const { MongoClient, ObjectId } = require('mongodb');

async function debug() {
  const uri = "mongodb+srv://kachak331_db_user:txh3HlTyK4ecy3PL@cluster0.rihdwbv.mongodb.net/?appName=Cluster0";
  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('Connected to Cluster');
    
    // List databases to find the right one
    const dbs = await client.db().admin().listDatabases();
    console.log('Databases:', dbs.databases.map(db => db.name));

    const dbName = 'test'; // Default if none specified
    const db = client.db(dbName);
    
    const user = await db.collection('users').findOne({ email: 'kachakaran06@gmail.com' });
    if (!user) {
        console.log('User not found in "test" DB. Trying "pms-orbit" if exists...');
        // Let's just find which DB has users
        for (const d of dbs.databases) {
            const u = await client.db(d.name).collection('users').findOne({ email: 'kachakaran06@gmail.com' });
            if (u) {
                console.log('User found in DB:', d.name);
                console.log('User Info:', { id: u._id, role: u.role, isApproved: u.isApproved });
                
                const members = await client.db(d.name).collection('organizationmembers').find({ userId: u._id }).toArray();
                console.log('Memberships:', members.map(m => ({ orgId: m.organizationId, role: m.role })));
                
                const perms = await client.db(d.name).collection('rolepermissions').find({ 
                    $or: [{ role: u.role }, { role: 'ADMIN' }, { role: 'SUPER_ADMIN' }] 
                }).toArray();
                console.log('Relevant Permissions in DB:', perms.map(p => `${p.role}: ${p.permission}`));
                break;
            }
        }
    }

  } finally {
    await client.close();
  }
}

debug().catch(console.error);
