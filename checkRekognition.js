import {
  RekognitionClient,
  ListCollectionsCommand,
  DescribeCollectionCommand,
  ListFacesCommand
} from "@aws-sdk/client-rekognition";

// ✅ Region
const client = new RekognitionClient({
  region: "ap-south-1"
});

async function run() {
  try {
    // 1. List collections
    const collections = await client.send(new ListCollectionsCommand({}));
    console.log("📦 Collections:", collections.CollectionIds);

    if (!collections.CollectionIds.length) {
      console.log("❌ No collections found");
      return;
    }

    const collectionId = collections.CollectionIds[0];

    // 2. Describe
    const describe = await client.send(
      new DescribeCollectionCommand({ CollectionId: collectionId })
    );
    console.log("📊 Collection:", describe);

    // 3. List faces
    const faces = await client.send(
      new ListFacesCommand({ CollectionId: collectionId })
    );

    console.log("🧑 Faces:");
    faces.Faces.forEach(face => {
      console.log({
        FaceId: face.FaceId,
        ExternalImageId: face.ExternalImageId
      });
    });

  } catch (err) {
    console.error("❌ Error:", err);
  }
}

run();