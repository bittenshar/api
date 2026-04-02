const AWS = require("aws-sdk");

// Region
AWS.config.update({ region: "ap-south-1" });

// Cognito Identity Pool
const credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: "ap-south-1:d131c0e9-7f22-4083-9300-e6c31b2f205b"
});

// Apply credentials
AWS.config.credentials = credentials;

// Create Rekognition client
const rekognition = new AWS.Rekognition();

// Test call
credentials.get(err => {
  if (err) {
    console.error("❌ Cognito Error:", err);
    return;
  }

  console.log("✅ Cognito credentials obtained");

  rekognition.listCollections({}, (err, data) => {
    if (err) {
      console.error("❌ Rekognition Error:", err);
    } else {
      console.log("✅ Rekognition working");
      console.log("Collections:", data.CollectionIds);
    }
  });
});

324010