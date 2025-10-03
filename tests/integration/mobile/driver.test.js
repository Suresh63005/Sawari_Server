const request = require("supertest");
const app = require("../../../src/app");
const { Driver, DriverCar, Car } = require("../../../src/models");
const jwt = require("jsonwebtoken");
// const firebaseAdmin = require("firebase-admin");
const { PutObjectCommand,} = require("@aws-sdk/client-s3");
const { getSignedUrl } = require("@aws-sdk/s3-request-presigner");
const sequelize = require("../../../src/config/db");
// const mockS3SendFn = jest.fn().mockResolvedValue({});

// Then, mock the AWS SDK.
// It"s crucial that mockS3SendFn is defined before this block.
// jest.mock("@aws-sdk/client-s3", () => {
//   return {
//     S3Client: jest.fn().mockImplementation(() => ({
//       send: mockS3SendFn, // This now safely references the pre-initialized mock
//     })),
//     PutObjectCommand: jest.fn(),
//     DeleteObjectCommand: jest.fn(),
//   };
// });

jest.mock("@aws-sdk/s3-request-presigner", () => ({
  getSignedUrl: jest.fn().mockResolvedValue("https://s3.amazonaws.com/drivers/profile.jpg?signed"),
}));

describe("Driver API Integration Tests", () => {
  beforeAll(async () => {
    await sequelize.sync({ force: true });
  });

  beforeEach(async () => {
    jest.clearAllMocks(); // Ensure mocks are reset
    getSignedUrl.mockResolvedValue("https://s3.amazonaws.com/drivers/profile.jpg?signed");
    await Driver.destroy({ truncate: true, cascade: true });
    await DriverCar.destroy({ truncate: true, cascade: true });
    await Car.destroy({ truncate: true, cascade: true });
  });

  afterAll(async () => {
    await sequelize.close();
  });

  describe("POST /api/v1/mobile/driver/verify", () => {
    it("should verify a new driver with Google social login and return 200", async () => {
      const email = "john@example.com";
      const token = "valid-google-token";
      require("../../../src/config/firebase-config").driverFirebase.auth().verifyIdToken.mockResolvedValue({ email });

      const response = await request(app)
        .post("/api/v1/mobile/driver/verify")
        .send({ email, token, social_login: "google" })
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("result");
      expect(response.body.result).toHaveProperty("token");
      expect(response.body.result).toHaveProperty("driver");
      expect(response.body.result.driver.email).toBe(email);
      expect(response.body.result.driver.status).toBe("inactive");

      const dbDriver = await Driver.findOne({ where: { email } });
      expect(dbDriver).not.toBeNull();
      expect(dbDriver.social_login).toBe("google");
      expect(dbDriver.last_login).toBeTruthy();
    });

    it("should verify an existing active driver with phone login and return 200", async () => {
      const phone = "+971912345678";
      const token = "valid-phone-token";
      require("../../../src/config/firebase-config").driverFirebase.auth().verifyIdToken.mockResolvedValue({ phone_number: "+971912345678" });

      await Driver.create({
        id: "123e4567-e89b-12d3-a456-426614174000",
        phone,
        email: "active@example.com",
        status: "active",
        last_login: new Date(),
      });

      const response = await request(app)
        .post("/api/v1/mobile/driver/verify")
        .send({ phone, token })
        .set("Accept", "application/json");

      expect(response.status).toBe(200);
      expect(response.body.result).toHaveProperty("token");
      expect(response.body.result.driver.phone).toBe(phone);
      expect(response.body.result.driver.status).toBe("active");

      const dbDriver = await Driver.findOne({ where: { phone } });
      expect(dbDriver.last_login).toBeTruthy();
    });

    it("should return 400 for invalid Google token", async () => {
      const email = "john@example.com";
      const token = "invalid-token";
      require("../../../src/config/firebase-config").driverFirebase.auth().verifyIdToken.mockRejectedValue(new Error("Invalid token"));

      const response = await request(app)
        .post("/api/v1/mobile/driver/verify")
        .send({ email, token, social_login: "google" })
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Invalid token");
    });

    it("should return 400 for email mismatch in Google login", async () => {
      const email = "john@example.com";
      const token = "valid-token";
      require("../../../src/config/firebase-config").driverFirebase.auth().verifyIdToken.mockResolvedValue({ email: "different@example.com" });

      const response = await request(app)
        .post("/api/v1/mobile/driver/verify")
        .send({ email, token, social_login: "google" })
        .set("Accept", "application/json");

      expect(response.status).toBe(400);
      expect(response.body.error).toBe("Email mismatch with token");
    });
  });

  describe("POST /api/v1/mobile/driver/update-profile", () => {
    let driverId, carId, token;
    beforeAll(async () => {
      process.env.S3_BUCKET_NAME = "innoitlabs"; // Add this line
      await sequelize.sync({ force: true });
    });

    beforeEach(async () => {
      driverId = "123e4567-e89b-12d3-a456-426614174000";
      carId = "223e4567-e89b-12d3-a456-426614174001";
      token = jwt.sign({ id: driverId }, process.env.JWT_SECRET || "your-secret", { expiresIn: "1h" });

      // Enhanced cleanup to avoid unique constraint errors
      await Driver.destroy({ truncate: true, cascade: true });
      await Car.destroy({ truncate: true, cascade: true });
      await DriverCar.destroy({ truncate: true, cascade: true });

      try {
        const uniqueEmail = `john-${Date.now()}@example.com`;
        // Seed driver with unique phone
        console.log("Seeding Driver with:", {
          id: driverId,
          email: uniqueEmail,
          phone: `+971912345678-${Date.now()}`, // Unique phone number
          status: "inactive",
          wallet_balance: 0.0,
          document_check_count: 0,
        });
        await Driver.create({
          id: driverId,
          email: uniqueEmail,
          phone: `+971912345678-${Date.now()}`, // Unique phone number
          status: "inactive",
          wallet_balance: 0.0,
          document_check_count: 0,
        });
        console.log("Driver created successfully");

        // Seed car
        console.log("Seeding Car with:", {
          id: carId,
          brand: "Toyota",
          model: "Camry",
          status: "active",
        });
        await Car.create({
          id: carId,
          brand: "Toyota",
          model: "Camry",
          status: "active",
        });
        console.log("Car created successfully");

        // Seed DriverCar with valid non-null fields
        console.log("Seeding DriverCar with:", {
          id: "323e4567-e89b-12d3-a456-426614174002",
          driver_id: driverId,
          car_id: carId,
          color: "red",
          license_plate: "XYZ789",
          car_photos: JSON.stringify(["https://s3.amazonaws.com/driver-cars/old_car.jpg"]),
          rc_doc: "https://s3.amazonaws.com/driver-cars/old_rc_doc.jpg",
          rc_doc_back: "https://s3.amazonaws.com/driver-cars/old_rc_doc_back.jpg",
          insurance_doc: "https://s3.amazonaws.com/driver-cars/old_insurance_doc.jpg",
          rc_doc_status: "pending",
          insurance_doc_status: "pending",
          is_approved: false,
        });
        await DriverCar.create({
          id: "323e4567-e89b-12d3-a456-426614174002",
          driver_id: driverId,
          car_id: carId,
          color: "red",
          license_plate: "XYZ789",
          car_photos: JSON.stringify(["https://s3.amazonaws.com/driver-cars/old_car.jpg"]),
          rc_doc: "https://s3.amazonaws.com/driver-cars/old_rc_doc.jpg",
          rc_doc_back: "https://s3.amazonaws.com/driver-cars/old_rc_doc_back.jpg",
          insurance_doc: "https://s3.amazonaws.com/driver-cars/old_insurance_doc.jpg",
          rc_doc_status: "pending",
          insurance_doc_status: "pending",
          is_approved: false,
        });
        console.log("DriverCar created successfully");
      } catch (error) {
        console.error("Error in beforeEach:", error);
        throw error;
      }
    });

    it("should update driver profile and create new car details with presigned URLs, returning 200", async () => {
      const profileData = {
        first_name: "John",
        last_name: "Doe",
        languages: JSON.stringify(["English", "Arabic"]),
        profile_pic: "https://s3.amazonaws.com/drivers/profile.jpg?signed",
        emirates_doc_front: "https://s3.amazonaws.com/drivers/emirates_front.jpg?signed",
      };
      const carData = {
        car_id: carId,
        license_plate: "ABC123",
        color: "Blue",
        car_photos: JSON.stringify(["https://s3.amazonaws.com/driver-cars/car1.jpg?signed","https://s3.amazonaws.com/driver-cars/car2.jpg?signed"]),
        rc_doc: "https://s3.amazonaws.com/driver-cars/rc_doc.jpg?signed",
        rc_doc_back: "https://s3.amazonaws.com/driver-cars/rc_doc_back.jpg?signed",
        insurance_doc: "https://s3.amazonaws.com/driver-cars/insurance_doc.jpg?signed",
      };

      console.log("Sending update-profile request with:", { ...profileData, ...carData });
      const response = await request(app)
        .post("/api/v1/mobile/driver/update-profile")
        .set("Authorization", `Bearer ${token}`)
        .set("Accept", "application/json")
        .send({ ...profileData, ...carData });

      console.log("Update-profile response:", response.body);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("driver");
      expect(response.body).toHaveProperty("vehicle");
      expect(response.body.driver.first_name).toBe("John");
      expect(response.body.driver.status).toBe("inactive");
      expect(response.body.vehicle.car_id).toBe(carId);
      expect(response.body.vehicle.rc_doc_status).toBe("pending");

      // Verify database state
      const dbDriver = await Driver.findByPk(driverId);
      console.log("Database Driver state:", dbDriver.toJSON());
      expect(dbDriver.first_name).toBe("John");
      expect(dbDriver.languages).toEqual(["English", "Arabic"]);
      expect(dbDriver.emirates_verification_status).toBe("pending");

      const dbCar = await DriverCar.findOne({ where: { driver_id: driverId } });
      console.log("Database DriverCar state:", dbCar.toJSON());
      expect(dbCar).not.toBeNull();
      expect(dbCar.car_id).toBe(carId);
      expect(JSON.parse(dbCar.car_photos)).toHaveLength(2);
      expect(dbCar.rc_doc_status).toBe("pending");
      expect(dbCar.insurance_doc_status).toBe("pending");
      expect(dbCar.is_approved).toBe(false);
    });


    // it("should update existing car details with new presigned URLs, preserving existing fields, returning 200", async () => {
    //   // Seed existing car
    //   await DriverCar.create({
    //     id: "323e4567-e89b-12d3-a456-426614174002",
    //     driver_id: driverId,
    //     car_id: carId,
    //     license_plate: "XYZ789",
    //     car_photos: ["https://s3.amazonaws.com/driver-cars/old_car.jpg"],
    //     rc_doc: "https://s3.amazonaws.com/driver-cars/old_rc_doc.jpg",
    //     rc_doc_status: "verified",
    //     insurance_doc: "https://s3.amazonaws.com/driver-cars/old_insurance.jpg",
    //     insurance_doc_status: "verified",
    //     is_approved: true,
    //   });

    //   const profileData = { first_name: "Jane" };
    //   const carData = {
    //     car_id: carId,
    //     license_plate: "NEW123",
    //     color: "Red",
    //     car_photos: JSON.stringify(["https://s3.amazonaws.com/driver-cars/new_car.jpg?signed"]),
    //   };

    //   const response = await request(app)
    //     .post("/api/v1/mobile/driver/update-profile")
    //     .set("Authorization", `Bearer ${token}`)
    //     .set("Accept", "application/json")
    //     .send({ ...profileData, ...carData });

    //   expect(response.status).toBe(200);
    //   expect(response.body.driver.first_name).toBe("Jane");
    //   expect(response.body.vehicle.license_plate).toBe("NEW123");
    //   expect(response.body.vehicle.car_photos).toContain("https://s3.amazonaws.com/driver-cars/new_car.jpg?signed");
    //   expect(response.body.vehicle.rc_doc_status).toBe("verified");
    //   expect(response.body.vehicle.is_approved).toBe(true);

    //   // Verify database state
    //   const dbDriver = await Driver.findByPk(driverId);
    //   expect(dbDriver.first_name).toBe("Jane");

    //   const dbCar = await DriverCar.findOne({ where: { driver_id: driverId } });
    //   expect(dbCar.color).toBe("Red");
    //   expect(dbCar.car_photos).toHaveLength(1);
    //   expect(S3Client.prototype.send).toHaveBeenCalledWith(
    //     expect.objectContaining({
    //       Bucket: process.env.S3_BUCKET_NAME,
    //       Key: "driver-cars/old_car.jpg",
    //     })
    //   );
    // });

    // it("should return 400 for missing driver ID", async () => {
    //   const response = await request(app)
    //     .post("/api/v1/driver/update-profile")
    //     .set("Accept", "application/json")
    //     .send({ first_name: "John" });

    //   expect(response.status).toBe(400);
    //   expect(response.body.error).toBe("Driver ID is missing in the request.");
    // });

    // it("should return 400 for missing required car fields on new car", async () => {
    //   const carData = { color: "Blue" };
    //   const response = await request(app)
    //     .post("/api/v1/driver/update-profile")
    //     .set("Authorization", `Bearer ${token}`)
    //     .set("Accept", "application/json")
    //     .send(carData);

    //   expect(response.status).toBe(400);
    //   expect(response.body.error).toContain("Missing required car fields");
    // });

    // it("should return 400 for duplicate email", async () => {
    //   await Driver.create({
    //     id: "223e4567-e89b-12d3-a456-426614174001",
    //     email: "jane@example.com",
    //     status: "inactive",
    //   });

    //   const response = await request(app)
    //     .post("/api/v1/driver/update-profile")
    //     .set("Authorization", `Bearer ${token}`)
    //     .set("Accept", "application/json")
    //     .send({ email: "jane@example.com" });

    //   expect(response.status).toBe(400);
    //   expect(response.body.error).toBe("Email is already in use.");
    // });

    // it("should skip car update when no car data provided, returning 200", async () => {
    //   const profileData = { first_name: "John" };
    //   const response = await request(app)
    //     .post("/api/v1/driver/update-profile")
    //     .set("Authorization", `Bearer ${token}`)
    //     .set("Accept", "application/json")
    //     .send(profileData);

    //   expect(response.status).toBe(200);
    //   expect(response.body.message).toBe("Driver profile updated successfully. No car data provided.");
    //   expect(response.body.driver.first_name).toBe("John");
    //   expect(response.body.vehicle).toBeNull();

    //   // Verify database state
    //   const dbDriver = await Driver.findByPk(driverId);
    //   expect(dbDriver.first_name).toBe("John");
    //   const dbCar = await DriverCar.findOne({ where: { driver_id: driverId } });
    //   expect(dbCar).toBeNull();
    // });
  });

  describe("POST /upload-image", () => {
    it("should generate presigned URL for image upload", async () => {
      // Ensure mock is set up correctly
      getSignedUrl.mockImplementation(async (client, command, options) => {
        console.log("getSignedUrl called with:", { client, command, options });
        return "https://s3.amazonaws.com/drivers/profile.jpg?signed";
      });

      const payload = { folder: "drivers", fileName: "profile.jpg", fileType: "image/jpeg" }; // Fixed fileType to match expectation
      console.log("Sending upload-image request with:", payload);
      const response = await request(app)
        .post("/upload-image")
        .send(payload)
        .set("Accept", "application/json");

      console.log("Upload-image response:", response.body);
      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty("uploadUrl");
      expect(response.body.uploadUrl).toContain("https://s3.amazonaws.com/");
      expect(response.body.bucket).toBe(process.env.S3_BUCKET_NAME || "innoitlabs");
      expect(response.body.fileType).toBe("drivers/profile.jpg");
      expect(getSignedUrl).toHaveBeenCalledWith(
        expect.any(Object),
        expect.any(PutObjectCommand), // Relaxed expectation to allow PutObjectCommand instance
        { expiresIn: 300 }
      );
    });

    it("should return 400 for missing fileName or fileType", async () => {
      const payload = { folder: "drivers" };
      console.log("Sending upload-image request with:", payload);
      const response = await request(app)
        .post("/upload-image")
        .send(payload)
        .set("Accept", "application/json");

      console.log("Upload-image response:", response.body);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe("fileName and fileType are required");
    });
  });

//   describe("DELETE /delete-image", () => {
//   it("should delete image from S3", async () => {
//     const response = await request(app)
//       .delete("/delete-image")
//       .send({ filePath: "drivers/profile.jpg" })
//       .set("Accept", "application/json");

//     expect(response.status).toBe(200);
//     expect(response.body.message).toBe("File deleted successfully");
//     expect(mockS3SendFn).toHaveBeenCalledWith(
//       expect.objectContaining({
//         Bucket: process.env.S3_BUCKET_NAME,
//         Key: "drivers/profile.jpg",
//       })
//     );
//   });

//   it("should return 400 for missing filePath", async () => {
//     const response = await request(app)
//       .delete("/delete-image")
//       .send({})
//       .set("Accept", "application/json");

//     expect(response.status).toBe(400);
//     expect(response.body.message).toBe("filePath is required");
//   });
// });
});