const router = require("express").Router();
const driverController = require("../../../controllers/admin/driver.controller");
const { authMiddleware } = require("../../../middlewares/admin/authMiddleware");
const { endPoints } = require("../../api");

router.get(
  endPoints.driver.getAllDrivers,
  authMiddleware,
  driverController.getAllDrivers
);
router.get(
  endPoints.driver.getDriverById,
  authMiddleware,
  driverController.getDriverById
);
router.post(
  endPoints.driver.approveDriver,
  authMiddleware,
  driverController.approveDriver
);
router.post(
  endPoints.driver.rejectDriver,
  authMiddleware,
  driverController.rejectDriver
);
router.post(
  endPoints.driver.blockDriver,
  authMiddleware,
  driverController.blockDriver
);
router.post(
  endPoints.driver.unblockDriver,
  authMiddleware,
  driverController.unblockDriver
);
router.post(
  endPoints.driver.verifyLicense,
  authMiddleware,
  driverController.verifyLicense
);
router.post(
  endPoints.driver.rejectLicense,
  authMiddleware,
  driverController.rejectLicense
);
router.post(
  endPoints.driver.verifyEmirates,
  authMiddleware,
  driverController.verifyEmirates
);
router.post(
  endPoints.driver.rejectEmirates,
  authMiddleware,
  driverController.rejectEmirates
);

module.exports = router;
