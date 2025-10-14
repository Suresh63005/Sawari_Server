const router = require("express").Router();
const vehicleController = require("../../../controllers/mobile/vehicle.controller");
const { upload } = require("../../../utils/multer");
const middleware = require("../../../middlewares/mobile/authMiddleware");
const { endPoints } = require("../../api");

router.put(
  endPoints["mob-vehicle"].updateVehicle,
  upload.array("car_photos", 5),
  middleware.isAuthenticated,
  vehicleController.updateVehicle
);

router.patch(
  endPoints["mob-vehicle"].uploadDocuments,
  upload.fields([
    { name: "rc_doc", maxCount: 1 },
    { name: "insurance_doc", maxCount: 1 },
    { name: "license_front", maxCount: 1 },
  ]),
  middleware.isAuthenticated,
  vehicleController.uploadDocuments
);

module.exports = router;
