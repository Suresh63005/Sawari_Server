const router = require("express").Router();
const settingController = require("../../../controllers/mobile/settings.controller");
const middleware = require("../../../middlewares/mobile/authMiddleware");
const { endPoints } = require("../../api");

router.get(endPoints["mob-settings"].getAllSettings, middleware.isAuthenticated, settingController.getAllSettings);

module.exports = router;