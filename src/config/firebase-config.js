require("dotenv").config();
const admin = require("firebase-admin");

const driverServiceAccount = {
  type: process.env.CUSTOMER_TYPE,
  project_id: process.env.CUSTOMER_PROJECT_ID,
  private_key_id: process.env.CUSTOMER_PRIVATE_KEY_ID,
  private_key: process.env.CUSTOMER_PRIVATE_KEY.replace(/\\n/g, '\n'),
  client_email: process.env.CUSTOMER_CLIENT_EMAIL,
  client_id: process.env.CUSTOMER_CLIENT_ID,
  auth_uri: process.env.CUSTOMER_AUTH_URI,
  token_uri: process.env.CUSTOMER_TOKEN_URI,
  auth_provider_x509_cert_url: process.env.CUSTOMER_AUTH_PROVIDER_X509_CERT_URL,
  client_x509_cert_url: process.env.CUSTOMER_CLIENT_X509_CERT_URL,
  universe_domain: process.env.CUSTOMER_UNIVERSE_DOMAIN,
};

// console.log(driverServiceAccount.private_key)
// console.log('PRIVATE KEY ===>');
// console.log(process.env.CUSTOMER_PRIVATE_KEY.replace(/\\n/g, '\n'));


const driverFirebase = admin.initializeApp({
    credential:admin.credential.cert(driverServiceAccount)
})

module.exports = {driverFirebase}