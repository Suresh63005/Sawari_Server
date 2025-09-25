const API_VERSION = "V1";

const endPoints = {
    // for admin
    auth: {
        listAdmins: `/${API_VERSION}/auth/admin-management`,
        createAdmin: `/${API_VERSION}/auth/admin-management`,
        updateAdmin: `/${API_VERSION}/auth/admin-management/:id`,
        updateAdminStatus: `/${API_VERSION}/auth/admin-management/:id/status`,
        updatePermissions: `/${API_VERSION}/auth/admin-management/:id/permissions`,
    },
    car: {
        upsertCar: `/${API_VERSION}/car/upsert`,
        getAllCars: `/${API_VERSION}/car/`,
        getCarsForListController: `/${API_VERSION}/car/list`,
        getCarById: `/${API_VERSION}/car/:id`,
        deleteCarById: `/${API_VERSION}/car/:id`,
        toggleCarStatus: `/${API_VERSION}/car/:id/status`,
        getCarsBySubPackageId: `/${API_VERSION}/car/by-sub-package/:sub_package_id`,
    },
    dashboard: {
        getDashboardStats: `/${API_VERSION}/dashboard/stats`,
        getRecentActivity: `/${API_VERSION}/dashboard/recent-activity`,
        getPendingApprovals: `/${API_VERSION}/dashboard/pending-approvals`,
    },
    driver:{
        getAllDrivers:`/${API_VERSION}/driver/`,
        getDriverById:`/${API_VERSION}/driver/:id`,
        approveDriver:`/${API_VERSION}/driver/:id/approve`,
        rejectDriver:`/${API_VERSION}/driver/:id/reject`,
        blockDriver:`/${API_VERSION}/driver/:id/block`,
        unblockDriver:`/${API_VERSION}/driver/:id/unblock`,
        verifyLicense:`/${API_VERSION}/driver/:id/verify-license`,
        rejectLicense:`/${API_VERSION}/driver/:id/reject-license"`,
        verifyEmirates:`/${API_VERSION}/driver/:id/verify-emirates`,
        rejectEmirates:`/${API_VERSION}/driver/:id/reject-emirates`,
    },
    driverreports:{
        
    }
};

module.exports = {
    endPoints,
    API_VERSION
};