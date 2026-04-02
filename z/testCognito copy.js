const AWS = require("aws-sdk");
const fs = require("fs");

AWS.config.update({ region: "ap-south-1" });

const credentials = new AWS.CognitoIdentityCredentials({
  IdentityPoolId: "ap-south-1:d131c0e9-7f22-4083-9300-e6c31b2f205b"
});

AWS.config.credentials = credentials;

const rekognition = new AWS.Rekognition();

credentials.get(err => {
  if (err) return console.error("❌ Cognito Error:", err);

  console.log("✅ Cognito credentials obtained");

  const imageBytes = fs.readFileSync("daksh.jpg");

  rekognition.searchFacesByImage({
    CollectionId: "facial_collection",
    Image: { Bytes: imageBytes }
  }, (err, data) => {
    if (err) {
      console.error("❌ Rekognition Error:", err);
    } else {
      console.log("✅ Match result:", data.FaceMatches);
    }
  });
});