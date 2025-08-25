const express = require('express');
const router = express.Router();
const packageController = require('../../../controllers/mobile/package.controller');
const authMiddleware = require('../../../middlewares/mobile/authMiddleware');

router.get("/get-all-packages",authMiddleware.isAuthenticated,packageController.getAllPackages);
router.get("/get-all-cars/:sub_package_id",authMiddleware.isAuthenticated,packageController.getAllCarsBySubPackageId);
router.get("/get-sub-packages/:package_id",authMiddleware.isAuthenticated,packageController.getSubPackagesByPackageId);

module.exports = router;