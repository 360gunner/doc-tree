const User = require('../models/User');
const Role = require('../models/Role');
const bcrypt = require('bcryptjs');

// List all users
exports.getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').populate('roles');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Get a single user
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password').populate('roles');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Create a new user
exports.createUser = async (req, res) => {
  try {
    const { username, password, roles = [] } = req.body;
    // Validate roles as array of role IDs
    const roleIds = roles.map(r => (typeof r === 'object' && r._id ? r._id : r));
    const user = new User({ username, password, roles: roleIds });
    await user.save();
    res.json(await User.findById(user._id).populate('roles'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Update user (roles or password)
exports.updateUser = async (req, res) => {
  try {
    const { username, password, roles, role } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (username) user.username = username;
    if (password) user.password = password;
    // Accept either 'roles' (array) or 'role' (single value)
    if (roles) {
      const roleIds = Array.isArray(roles)
        ? roles.map(r => (typeof r === 'object' && r._id ? r._id : r))
        : [];
      user.roles = roleIds;
    } else if (role) {
      user.roles = [typeof role === 'object' && role._id ? role._id : role];
    }
    await user.save();
    res.json(await User.findById(user._id).populate('roles'));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
