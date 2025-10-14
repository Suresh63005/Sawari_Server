const router = require("express").Router();
const walletController = require("../../../controllers/mobile/wallet.controller");
const middleware = require("../../../middlewares/mobile/authMiddleware");
const { endPoints } = require("../../api");

router.post(
  endPoints.wallet.addMoneyToWallet,
  middleware.isAuthenticated,
  walletController.addMoneyToWallet
);
router.post(
  endPoints.wallet.verifyPayment,
  middleware.isAuthenticated,
  walletController.verifyPayment
);
router.get(
  endPoints.wallet.walletHistory,
  middleware.isAuthenticated,
  walletController.walletHistory
);
router.get(
  endPoints.wallet.myWalletBalance,
  middleware.isAuthenticated,
  walletController.myWalletBalance
);

module.exports = router;
