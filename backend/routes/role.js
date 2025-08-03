const express = require('express');
const router = express.Router();
const roleController = require('../controllers/roleController');
const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');

// All role management endpoints require admin
router.use(authenticateJWT, requireAdmin);

router.get('/', roleController.getRoles);
router.get('/:id', roleController.getRole);
router.post('/', roleController.createRole);
router.patch('/:id', roleController.updateRole);
router.delete('/:id', roleController.deleteRole);

module.exports = router;
