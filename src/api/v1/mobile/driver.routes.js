const express = require("express");
const router = express.Router();
const driverAuthController = require("../../../controllers/mobile/driver-auth.controller");
const authMiddleware = require("../../../middlewares/mobile/authMiddleware");
const { endPoints } = require("../../api");
const { validateRequest } = require("../../../middlewares/validateRequest");
const {
  blockDriverSchema,
  updateStatusSchema,
} = require("../../../validators/mobile/driver");

router.post(
  endPoints["mob-driver"].verifyMobile,
  driverAuthController.verifyMobile
);
router.post(
  endPoints["mob-driver"].blockDriverByIdentifier,
  validateRequest(blockDriverSchema),
  driverAuthController.blockDriverByIdentifier
);
router.post(
  endPoints["mob-driver"].updateProfileAndCarDetails,
  authMiddleware.isAuthenticated,
  driverAuthController.updateProfileAndCarDetails
);
router.get(
  endPoints["mob-driver"].verifdriverAccountDetailsyRc,
  authMiddleware.isAuthenticated,
  driverAuthController.driverAccountDetails
);
router.put(
  endPoints["mob-driver"].deleteAccount,
  authMiddleware.isAuthenticated,
  driverAuthController.deleteAccount
);
router.get(
  endPoints["mob-driver"].checkStatus,
  authMiddleware.isAuthenticated,
  driverAuthController.checkStatus
);
router.get(
  endPoints["mob-driver"].getStatuses,
  authMiddleware.isAuthenticated,
  driverAuthController.getStatuses
);
router.put(
  endPoints["mob-driver"].updateStatuses,
  authMiddleware.isAuthenticated,
  validateRequest(updateStatusSchema),
  driverAuthController.updateStatuses
);
router.put(
  endPoints["mob-driver"].updateOneSignalId,
  authMiddleware.isAuthenticated,
  driverAuthController.updateOneSignalId
);
router.put(
  endPoints["mob-driver"].deleteOneSignalId,
  authMiddleware.isAuthenticated,
  driverAuthController.deleteOneSignalId
);

module.exports = router;
