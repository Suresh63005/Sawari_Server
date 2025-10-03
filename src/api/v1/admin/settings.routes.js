const router = require("express").Router();
const { getSettingsController, upsertSettingsController } = require("../../../controllers/admin/settings.controller");
const { endPoints } = require("../../api");

router.get(endPoints.settings.getSettings, getSettingsController);
router.post(endPoints.settings.upsertSettings, upsertSettingsController);

module.exports = router;