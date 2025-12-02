const mongoose = require('mongoose');
require('dotenv').config();

async function run() {
  const uri = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/test';
  await mongoose.connect(uri, { useNewUrlParser: true, useUnifiedTopology: true });
  const coll = mongoose.connection.collection('users');

  try {
    console.log('Dropping existing index email_1 if present...');
    const indexes = await coll.indexes();
    const hasEmailIndex = indexes.some(ix => ix.name === 'email_1');
    if (hasEmailIndex) {
      await coll.dropIndex('email_1');
      console.log('Dropped index email_1');
    } else {
      console.log('No existing email_1 index to drop');
    }
  } catch (e) {
    console.log('Error while dropping email_1 index:', e.message);
  }

  await mongoose.disconnect();
}

run().catch(err => { console.error(err); process.exit(1); });
