// require("dotenv").config();
// const admin = require("firebase-admin");

// const driverServiceAccount = {
//   type: process.env.DRIVER_TYPE,
//   project_id: process.env.DRIVER_PROJECT_ID,
//   private_key_id: process.env.DRIVER_PRIVATE_KEY_ID,
//   private_key: process.env.DRIVER_PRIVATE_KEY.replace(/\\n/g, "\n"),
//   client_email: process.env.DRIVER_CLIENT_EMAIL,
//   client_id: process.env.DRIVER_CLIENT_ID,
//   auth_uri: process.env.DRIVER_AUTH_URI,
//   token_uri: process.env.DRIVER_TOKEN_URI,
//   auth_provider_x509_cert_url: process.env.DRIVER_AUTH_PROVIDER_X509_CERT_URL,
//   client_x509_cert_url: process.env.DRIVER_CLIENT_X509_CERT_URL,
//   universe_domain: process.env.DRIVER_UNIVERSE_DOMAIN,
// };

// // console.log(driverServiceAccount.private_key)
// // console.log("PRIVATE KEY ===>");
// // console.log(process.env.CUSTOMER_PRIVATE_KEY.replace(/\\n/g, "\n"));

// const driverFirebase = admin.initializeApp({
//     credential:admin.credential.cert(driverServiceAccount)
// });

// module.exports = {driverFirebase};

require("dotenv").config();
const admin = require("firebase-admin");
const isTestMode = process.env.NODE_ENV === "test";

let driverFirebase;

if (!isTestMode) {
  const driverServiceAccount = {
    type: process.env.DRIVER_TYPE,
    project_id: process.env.DRIVER_PROJECT_ID,
    private_key_id: process.env.DRIVER_PRIVATE_KEY_ID,
    private_key: process.env.DRIVER_PRIVATE_KEY
      ? process.env.DRIVER_PRIVATE_KEY.replace(/\\n/g, "\n")
      : undefined,
    client_email: process.env.DRIVER_CLIENT_EMAIL,
    client_id: process.env.DRIVER_CLIENT_ID,
    auth_uri: process.env.DRIVER_AUTH_URI,
    token_uri: process.env.DRIVER_TOKEN_URI,
    auth_provider_x509_cert_url: process.env.DRIVER_AUTH_PROVIDER_X509_CERT_URL,
    client_x509_cert_url: process.env.DRIVER_CLIENT_X509_CERT_URL,
    universe_domain: process.env.DRIVER_UNIVERSE_DOMAIN,
  };

  driverFirebase = admin.initializeApp({
    credential: admin.credential.cert(driverServiceAccount),
  });
} else {
  driverFirebase = {
    auth: jest.fn().mockReturnValue({
      verifyIdToken: jest.fn(),
    }),
  };
}

module.exports = { driverFirebase };
