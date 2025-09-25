const router = require("express").Router();
const packageController = require("../../../controllers/mobile/package.controller");
const authMiddleware = require("../../../middlewares/mobile/authMiddleware");

router.get("/get-all-packages", authMiddleware.isAuthenticated, packageController.getAllPackages);
router.get("/get-all-cars/:sub_package_id", authMiddleware.isAuthenticated, packageController.getAllCarsBySubPackageId);
router.get("/get-sub-packages/:package_id", authMiddleware.isAuthenticated, packageController.getSubPackagesByPackageId);
router.get("/get-price/:package_id/:sub_package_id/:car_id", authMiddleware.isAuthenticated, packageController.getPrice);
router.get("/get-all-cars", authMiddleware.isAuthenticated, packageController.getAllCars);

module.exports = router;