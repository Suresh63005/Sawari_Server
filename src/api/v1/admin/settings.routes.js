const router = require("express").Router();
const { getSettingsController, upsertSettingsController } = require("../../../controllers/admin/settings.controller");

router.get("/", getSettingsController);
router.post("/", upsertSettingsController);

module.exports = router;