require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const apiRoutes = require('./routes/api');
const uploadRoutes = require('./routes/upload');
const userRoutes = require('./routes/user');
const roleRoutes = require('./routes/role');
const User = require('./models/User');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 7689;

app.use(cors());
app.use(express.json());
app.use('/api', apiRoutes);
app.use('/api/users', userRoutes);
app.use('/api/roles', roleRoutes);
app.use('/uploads', express.static('uploads'));
app.use('/upload', uploadRoutes);

mongoose.connect(process.env.MONGO_URI || 'mongodb://localhost:27017/organigram', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// --- Ensure at least one admin user exists ---
async function ensureAdminUser() {
  // Find the admin role or create it if missing
  let adminRole = await require('./models/Role').findOne({ name: 'admin' });
  if (!adminRole) {
    adminRole = await require('./models/Role').create({ name: 'admin', description: 'System administrator' });
  }

  // Find the admin user (legacy or new)
  let adminUser = await require('./models/User').findOne({ username: 'admin' });
  if (!adminUser) {
    const randomPassword = require('crypto').randomBytes(8).toString('base64');
    adminUser = new (require('./models/User'))({
      username: 'admin',
      password: randomPassword,
      roles: [adminRole._id]
    });
    await adminUser.save();
    console.log('=================================================');
    console.log('No admin user found. A new admin user has been created:');
    console.log(`Username: admin`);
    console.log(`Password: ${randomPassword}`);
    console.log('PLEASE CHANGE THIS PASSWORD AFTER FIRST LOGIN!');
    console.log('=================================================');
  } else {
    // PATCH: If admin user exists but does not have the admin role, add it
    if (!adminUser.roles || !adminUser.roles.map(r => r.toString()).includes(adminRole._id.toString())) {
      adminUser.roles = Array.isArray(adminUser.roles) ? adminUser.roles : [];
      adminUser.roles.push(adminRole._id);
      await adminUser.save();
      console.log('Admin user patched to have admin role.');
    }
  }
}

// Function to initialize OrganigramNode collection from JSON file
async function initializeOrganigramData() {
  try {
    const OrganigramNode = require('./models/OrganigramNode');
    const count = await OrganigramNode.countDocuments();
    
    // Only initialize if collection is empty
    if (count === 0) {
      console.log('Initializing OrganigramNode collection with default data...');
      const filePath = path.join(__dirname, 'data', 'organigram.json');
      const data = await fs.readFile(filePath, 'utf8');
      const nodes = JSON.parse(data);
      
      // Process nodes to ensure proper ObjectId references
      const processedNodes = nodes.map(node => ({
        ...node,
        _id: new mongoose.Types.ObjectId(node._id.$oid),
        parent: node.parent ? new mongoose.Types.ObjectId(node.parent.$oid) : null,
        createdAt: new Date(node.createdAt.$date),
        updatedAt: node.updatedAt ? new Date(node.updatedAt.$date) : new Date(node.createdAt.$date)
      }));
      
      await OrganigramNode.insertMany(processedNodes);
      console.log(`Successfully initialized ${processedNodes.length} OrganigramNode documents`);
    } else {
      console.log('OrganigramNode collection already contains data, skipping initialization');
    }
  } catch (error) {
    console.error('Error initializing OrganigramNode data:', error);
    process.exit(1);
  }
}

mongoose.connection.once('open', async () => {
  console.log('MongoDB connected');
  await ensureAdminUser();
  await initializeOrganigramData();
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
});
