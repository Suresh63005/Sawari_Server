const express = require('express');
const router = express.Router();
const carController = require('../../../controllers/admin/car.controller');
const {upload,handleMulterError}=require('../../../utils/multer');

router.post('/upsert',upload.single('image'),carController.upsertCar);
router.get('/',carController.getAllCars);
router.get('/:id',carController.getCarById);
router.delete('/:id',carController.deleteCarById);


module.exports = router;