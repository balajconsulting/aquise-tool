const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const JWT_SECRET = process.env.JWT_SECRET || 'supersecret';

exports.login = async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findByUsername(username);
  if (!user) return res.status(401).json({ error: 'Benutzer nicht gefunden' });
  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Falsches Passwort' });
  const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: user.id, username: user.username, role: user.role } });
};

exports.getAllUsers = async (req, res) => {
  const users = await User.getAll();
  res.json(users);
};

exports.createUser = async (req, res) => {
  const { username, password, role } = req.body;
  const password_hash = await bcrypt.hash(password, 10);
  await User.create({ username, password_hash, role });
  res.status(201).json({ message: 'Benutzer erstellt' });
};

exports.updatePassword = async (req, res) => {
  const { id } = req.params;
  const { password } = req.body;
  const password_hash = await bcrypt.hash(password, 10);
  await User.updatePassword(id, password_hash);
  res.json({ message: 'Passwort geändert' });
};

exports.updateRole = async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;
  await User.updateRole(id, role);
  res.json({ message: 'Rolle geändert' });
};

exports.initAdmin = async () => {
  const admin = await User.findByUsername('admin');
  if (!admin) {
    const password_hash = await bcrypt.hash('admin', 10);
    await User.create({ username: 'admin', password_hash, role: 'superadmin' });
    console.log('Admin-User admin/admin wurde angelegt.');
  }
}; 