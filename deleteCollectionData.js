import {
  RekognitionClient,
  ListCollectionsCommand,
  ListFacesCommand,
  DeleteFacesCommand
} from "@aws-sdk/client-rekognition";

const client = new RekognitionClient({
  region: "ap-south-1"
});

async function deleteAllFacesFromCollection(collectionId) {
  try {
    console.log(`🔍 Fetching all faces from collection: ${collectionId}`);
    
    // Get all faces from the collection
    const listFacesResponse = await client.send(
      new ListFacesCommand({ CollectionId: collectionId })
    );

    const faceIds = listFacesResponse.Faces.map(face => face.FaceId);
    
    if (faceIds.length === 0) {
      console.log("✅ No faces found in collection");
      return;
    }

    console.log(`📊 Found ${faceIds.length} faces to delete`);

    // Delete all faces in batches (API allows up to 4096 faces per request)
    const batchSize = 4096;
    for (let i = 0; i < faceIds.length; i += batchSize) {
      const batch = faceIds.slice(i, i + batchSize);
      
      console.log(`🗑️  Deleting batch ${Math.floor(i / batchSize) + 1} (${batch.length} faces)...`);
      
      await client.send(
        new DeleteFacesCommand({
          CollectionId: collectionId,
          FaceIds: batch
        })
      );
    }

    console.log("✅ All faces deleted successfully");

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

async function run() {
  try {
    // List all collections
    const collections = await client.send(new ListCollectionsCommand({}));
    
    if (!collections.CollectionIds.length) {
      console.log("❌ No collections found");
      return;
    }

    console.log("📦 Available collections:", collections.CollectionIds);
    
    // Delete from first collection or specify one
    const collectionId = collections.CollectionIds[0];
    console.log(`\n🎯 Deleting data from: ${collectionId}\n`);
    
    await deleteAllFacesFromCollection(collectionId);

  } catch (err) {
    console.error("❌ Error:", err.message);
  }
}

run();
