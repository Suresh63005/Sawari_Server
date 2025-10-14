const router = require("express").Router();
const vehicleController = require("../../../controllers/admin/vehicle.controller");
const { authMiddleware } = require("../../../middlewares/admin/authMiddleware");
const { endPoints } = require("../../api");

router.get(
  endPoints.vehicles.getAllVehicles,
  authMiddleware,
  vehicleController.getAllVehicles
);
router.post(
  endPoints.vehicles.approveVehicle,
  authMiddleware,
  vehicleController.approveVehicle
);
router.get(
  endPoints.vehicles.getVehiclesByDriver,
  authMiddleware,
  vehicleController.getVehiclesByDriver
);
router.post(
  endPoints.vehicles.rejectVehicle,
  authMiddleware,
  vehicleController.rejectVehicle
);
router.post(
  endPoints.vehicles.verifyRc,
  authMiddleware,
  vehicleController.verifyRc
);
router.post(
  endPoints.vehicles.rejectRc,
  authMiddleware,
  vehicleController.rejectRc
);
router.post(
  endPoints.vehicles.verifyInsurance,
  authMiddleware,
  vehicleController.verifyInsurance
);
router.post(
  endPoints.vehicles.rejectInsurance,
  authMiddleware,
  vehicleController.rejectInsurance
);

module.exports = router;
