
const { db } = require("./firebaseAdmin");

async function testFirebase() {
  try {
    await db.collection("_connection_test").limit(1).get();
    console.log("Firebase Admin SDK connected successfully!");
  } catch (error) {
    console.error("Firebase connection failed:", error.message);
  }
}

testFirebase();
