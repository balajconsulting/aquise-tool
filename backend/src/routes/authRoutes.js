const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

router.post('/login', authController.login);
router.get('/users', authController.getAllUsers);
router.post('/users', authController.createUser);
router.patch('/users/:id/password', authController.updatePassword);
router.patch('/users/:id/role', authController.updateRole);

module.exports = router; 