const Earnings = require('../models/earnings.model');

const earningsDTO = (data)=>{
    return{
        driver_id:data.driver_id,
        ride_id:data.ride_id,
        amount:data.amount,
        commission:data.commission,
        percentage:data.percentage,
        payment_method:data.payment_method,
        status:data.status,
    }
}

const earningsResponseDTO = (earnings)=>{
    return{
        id:earnings.id,
        driver_id:earnings.driver_id,
        ride_id:earnings.ride_id,
        amount:earnings.amount,
        commission:earnings.commission,
        percentage:earnings.percentage,
        payment_method:earnings.payment_method,
        status:earnings.status,
    }
}

// const 