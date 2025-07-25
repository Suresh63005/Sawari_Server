const express = require('express');
const router = express.Router();
const carController = require('../../../controllers/admin/car.controller');
const {upload,handleMulterError}=require('../../../utils/multer');

// Routes for car operations
router.post('/upsert', upload.single('image'), carController.upsertCar);
router.get('/', carController.getAllCars);
router.get('/:id', carController.getCarById);
router.delete('/:id', carController.deleteCarById);
router.patch('/:id/status', carController.toggleCarStatus);

module.exports = router;