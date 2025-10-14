const router = require("express").Router();
const settingController = require("../../../controllers/mobile/settings.controller");
const { endPoints } = require("../../api");

router.get(
  endPoints["mob-settings"].getAllSettings,
  settingController.getAllSettings
);

module.exports = router;
