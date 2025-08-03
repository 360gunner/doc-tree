const express = require('express');
const router = express.Router();
const userController = require('../controllers/userController');
const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');

// All routes are for admins only
router.use(authenticateJWT, requireAdmin);

router.get('/', userController.getUsers);
router.get('/:id', userController.getUser);
router.post('/', userController.createUser);
router.patch('/:id', userController.updateUser);
router.delete('/:id', userController.deleteUser);

module.exports = router;
