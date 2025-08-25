const express = require('express');
const router = express.Router();
const apiController = require('../controllers/apiController');
const { authenticateJWT, requireAdmin } = require('../middleware/authMiddleware');
const globalSettingsController = require('../controllers/globalSettingsController');

// --- Auth endpoints ---
router.post('/login', apiController.login);
router.post('/register', apiController.register); // demo only, can be removed
router.get('/me', apiController.authMiddleware(), apiController.getCurrentUser);

router.get('/organigram', apiController.getOrganigram);
router.post('/organigram/update', authenticateJWT, apiController.updateOrganigram);
//router.get('/organigram/progress', apiController.getOrganigramProgress);
//router.get('/organigram/missing', apiController.getMissingDocuments);
router.post('/categories', authenticateJWT, apiController.createCategory);
router.post('/categories/addDocument', authenticateJWT, apiController.addDocumentToCategory);
router.get('/categories', apiController.getAllCategories);

// Category tree endpoint
router.get('/categories/tree', apiController.getCategoryTree);

// --- Category CRUD ---
router.patch('/categories/:id', authenticateJWT, apiController.updateCategory); // update category name
router.delete('/categories/:id', authenticateJWT, apiController.deleteCategory); // delete category

// --- Documents endpoints ---
router.get('/documents', authenticateJWT, apiController.getDocumentsByCategory); // supports ?category=... or returns all
router.delete('/documents/:documentId', authenticateJWT, apiController.deleteDocument); // delete document by id
router.patch('/documents/:documentId', authenticateJWT, apiController.updateDocument); // update document
router.post('/documents/:documentId/share', authenticateJWT, apiController.shareDocument); // enable/disable share
router.get('/public/document/:token', apiController.getPublicDocument); // public link

// --- Organigram Node endpoints ---
router.post('/organigram/nodes', authenticateJWT, apiController.createOrganigramNode); // create node
router.get('/organigram/tree', authenticateJWT, apiController.getOrganigramTree); // get tree
router.patch('/organigram/nodes/:id', authenticateJWT, apiController.updateOrganigramNode); // update node
router.delete('/organigram/nodes/:id', authenticateJWT, apiController.deleteOrganigramNode); // delete node and children
router.post('/organigram/nodes/:id/upload', authenticateJWT, apiController.uploadOrganigramFile); // upload file to node
router.post('/organigram/nodes/:id/share', authenticateJWT, apiController.shareOrganigramNode); // enable/disable share
router.get('/public/organigram/:token', apiController.getPublicOrganigramNode); // public link
router.get('/organigram/missing', apiController.getOrganigramMissingNodes); // nodes with no file
router.get('/organigram/progress', apiController.getOrganigramProgressNodes); // percent completed

// --- Search endpoints ---
router.get('/search/organigram', authenticateJWT, apiController.searchOrganigram);
router.get('/search/documents', authenticateJWT, apiController.searchDocuments);

// --- Global Settings endpoints (admin only) ---
router.get('/global-settings', authenticateJWT, globalSettingsController.getGlobalSettings);
router.put('/global-settings', authenticateJWT, requireAdmin, globalSettingsController.updateGlobalSettings);

module.exports = router;
