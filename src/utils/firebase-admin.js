const admin = require('firebase-admin');

if (!admin.apps.length) {
  const sa = process.env.FIREBASE_SERVICE_ACCOUNT;
  admin.initializeApp({
    credential: sa
      ? admin.credential.cert(JSON.parse(sa))
      : admin.credential.applicationDefault(),
  });
}

async function verifyFirebaseToken(idToken) {
  return admin.auth().verifyIdToken(idToken);
}

module.exports = { verifyFirebaseToken };
