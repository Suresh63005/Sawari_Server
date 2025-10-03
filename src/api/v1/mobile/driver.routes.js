const express = require("express");
const router = express.Router();
const driverAuthController = require("../../../controllers/mobile/driver-auth.controller");
const authMiddleware = require("../../../middlewares/mobile/authMiddleware");
const { upload } = require("../../../utils/multer");
const { endPoints } = require("../../api");

router.post(endPoints["mob-driver"].verifyMobile, driverAuthController.verifyMobile);
router.post(endPoints["mob-driver"].blockDriverByIdentifier, driverAuthController.blockDriverByIdentifier);
router.post(endPoints["mob-driver"].updateProfileAndCarDetails,
    authMiddleware.isAuthenticated,
    upload.fields([
        { name: "profile_pic", maxCount: 1 },
        { name: "emirates_doc_front", maxCount: 1 },
        { name: "emirates_doc_back", maxCount: 1 },
        { name: "license_front", maxCount: 1 },
        { name: "license_back", maxCount: 1 },
        { name: "car_photos", maxCount: 5 },
        { name: "rc_doc", maxCount: 1 },
        { name: "rc_doc_back", maxCount: 1 },
        { name: "insurance_doc", maxCount: 1 },
    ]),
    driverAuthController.updateProfileAndCarDetails
);
router.get(endPoints["mob-driver"].verifdriverAccountDetailsyRc, authMiddleware.isAuthenticated, driverAuthController.driverAccountDetails);
router.put(endPoints["mob-driver"].deleteAccount, authMiddleware.isAuthenticated, driverAuthController.deleteAccount);
router.get(endPoints["mob-driver"].checkStatus, authMiddleware.isAuthenticated, driverAuthController.checkStatus);
router.get(endPoints["mob-driver"].getStatuses, authMiddleware.isAuthenticated, driverAuthController.getStatuses);
router.put(endPoints["mob-driver"].updateStatuses, authMiddleware.isAuthenticated, driverAuthController.updateStatuses);
router.put(endPoints["mob-driver"].updateOneSignalId, authMiddleware.isAuthenticated, driverAuthController.updateOneSignalId);
router.put(endPoints["mob-driver"].deleteOneSignalId, authMiddleware.isAuthenticated, driverAuthController.deleteOneSignalId);

module.exports = router;