const carService = require('../../services/car.service');
const {deleteFromS3, uploadToS3}=require('../../config/fileUpload.aws')

/**
 * Controller for upsert(create/update) a car
 * @param {Object} req - Request object containing car data
 * @param {Object} res - Response object to send the result
 * * @returns {Object} - Response with success message and car data
 * 
 */

const upsertCar = async(req,res)=>{
    try {
        let imageUrl=null;
        if(req.file){
            imageUrl=await uploadToS3(req.file,"cars");
            req.body.image_url=imageUrl;
        }
        const result = await carService.upsertCar(req.body);
        // Delete the old image if updating with a new image
        if(req.body.id && req.body.image_url){
            const oldCar = await carService.getCarById(req.body.id)
            if(oldCar && oldCar.image_url && oldCar.image_url !== req.body.image_url){
                await deleteFromS3(oldCar.image_url);
            }
        }

        res.status(200).json(result)

    } catch (error) {
        res.status(400).json({ error: err.message });
        console.error(`Error in upsertCar: ${error.message}`);
    }
}

const getAllCars =  async(req,res)=>{
try {
        const {search = '',
          limit = 10,
          page = 1,
          sortBy = 'createdAt',
          sortOrder = 'DESC',
          status = 'active',
        } = req.query;

        const result = await carService.getAllCars({
            search,
            limit,
            page,
            sortBy,
            sortOrder,
            status,
        });

        res.status(200).json({
            message:'Cars retrieved successfully',
            result,
        })
} catch (error) {
        res.status(400).json({ error: error.message });
        console.error(`Error in getAllCars: ${error.message}`);
}


}

// Controllere to get a car by Id
const getCarById =  async(req,res)=>{
    try {
        const result = await carService.getCarById(req.params.id);
        res.status(200).json({
            message:'Car retrieved successfully',
            data:result,
        })
    } catch (error) {
        res.status(404).json({ error: err.message });
        console.error(`Error in getCarById: ${error.message}`)
    }
}

// Controller to delete a car by Id
const deleteCarById = async(req,res)=>{
    try {
        const result = await carService.deleteCarById(req.params.id);
        res.status(200).json({
            message:'Car deleted successfully',
            data:result.data,
        })
    } catch (error) {
        res.status(404).json({ error: error.message });
        console.error(`Error in deleteCarById: ${error.message}`);
        
    }
}

module.exports = {
    upsertCar,
    getAllCars,
    getCarById,
    deleteCarById
}