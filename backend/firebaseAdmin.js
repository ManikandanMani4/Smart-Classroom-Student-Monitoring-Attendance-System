
const { initializeApp, cert, getApps } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getAuth } = require("firebase-admin/auth");
const path = require("path");

const serviceAccount = require(
  path.join(__dirname, "serviceAccountKey.json")
);

const app = getApps().length
  ? getApps()[0]
  : initializeApp({
      credential: cert(serviceAccount),
    });

const db = getFirestore(app);
const auth = getAuth(app);

const ADMIN_UID = "UPJ1FQQX3EXYdwnIjwtUQDWOb863";

module.exports = { app, db, auth, ADMIN_UID };
