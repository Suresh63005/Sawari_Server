const express = require('express');
const router = express.Router();
const carController = require('../../../controllers/admin/car.controller');
const {upload,handleMulterError}=require('../../../utils/multer');

// Routes for car operations
router.post('/upsert', upload.single('image'), carController.upsertCar);
router.get('/', carController.getAllCars);
router.get('/list', carController.getCarsForListController);
router.get('/:id', carController.getCarById);
router.delete('/:id', carController.deleteCarById);
router.patch('/:id/status', carController.toggleCarStatus);
router.get('/by-sub-package/:sub_package_id', carController.getCarsBySubPackageId);

module.exports = router;