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
router.post('/organigram/update', apiController.updateOrganigram);
//router.get('/organigram/progress', apiController.getOrganigramProgress);
//router.get('/organigram/missing', apiController.getMissingDocuments);
router.post('/categories', apiController.createCategory);
router.post('/categories/addDocument', apiController.addDocumentToCategory);
router.get('/categories', apiController.getAllCategories);

// Category tree endpoint
router.get('/categories/tree', apiController.getCategoryTree);

// --- Category CRUD ---
router.patch('/categories/:id', apiController.updateCategory); // update category name
router.delete('/categories/:id', apiController.deleteCategory); // delete category

// --- Documents endpoints ---
router.get('/documents', apiController.getDocumentsByCategory); // supports ?category=... or returns all
router.delete('/documents/:documentId', apiController.deleteDocument); // delete document by id
router.patch('/documents/:documentId', apiController.updateDocument); // update document

// --- Organigram Node endpoints ---
router.post('/organigram/nodes', apiController.createOrganigramNode); // create node
router.get('/organigram/tree', apiController.getOrganigramTree); // get tree
router.patch('/organigram/nodes/:id', apiController.updateOrganigramNode); // update node
router.delete('/organigram/nodes/:id', apiController.deleteOrganigramNode); // delete node and children
router.post('/organigram/nodes/:id/upload', authenticateJWT, apiController.uploadOrganigramFile); // upload file to node
router.get('/organigram/missing', apiController.getOrganigramMissingNodes); // nodes with no file
router.get('/organigram/progress', apiController.getOrganigramProgressNodes); // percent completed

// --- Global Settings endpoints (admin only) ---
router.get('/global-settings', authenticateJWT, globalSettingsController.getGlobalSettings);
router.put('/global-settings', authenticateJWT, requireAdmin, globalSettingsController.updateGlobalSettings);

module.exports = router;
