const router = require("express").Router();
const { getAllPaymentsController, getPaymentByIdController, exportAllPaymentsController, exportPaymentByIdController,} = require("../../../controllers/admin/paymentreports.controller");

// Static routes first
router.get("/all", getAllPaymentsController);
router.get("/export-all", exportAllPaymentsController);
// Dynamic routes last
router.get("/export/:paymentId", exportPaymentByIdController);
router.get("/:paymentId", getPaymentByIdController);

module.exports = router;