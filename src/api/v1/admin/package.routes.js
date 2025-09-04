const express = require('express');
const router = express.Router();
const packageController = require('../../../controllers/admin/package.controller');

router.post('/upsert',packageController.upsertPackage);

// GET /api/packages?search=monthly&limit=5&page=2&sortBy=name&sortOrder=asc&status=active
router.get('/',packageController.getAllPackages);
router.get('/active', packageController.getActivePackagesController);
router.get("/:id",packageController.getPackageById)
router.delete("/:id",packageController.deletePackageById);
router.patch('/:id/status', packageController.togglePackageStatus);

module.exports = router;