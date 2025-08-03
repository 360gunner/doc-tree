const express = require('express');
const router = express.Router();
const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');
const globalSettingsController = require('../controllers/globalSettingsController');

router.get('/', authenticateJWT, requireAdmin, globalSettingsController.getGlobalSettings);
router.put('/', authenticateJWT, requireAdmin, globalSettingsController.updateGlobalSettings);

module.exports = router;
