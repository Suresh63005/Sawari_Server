const router = require("express").Router();
const {
  getSettingsController,
  upsertSettingsController,
} = require("../../../controllers/admin/settings.controller");
const { endPoints } = require("../../api");

const { upload } = require("../../../utils/multer");
router.get(endPoints.settings.getSettings, getSettingsController);
router.post(
  endPoints.settings.upsertSettings,
  upload.single("weblogo"),
  upsertSettingsController
);

module.exports = router;
