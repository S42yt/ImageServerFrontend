import { getClientPromise } from "./mongodb";
import { ObjectId } from "mongodb";

const DB_NAME = "serverImagesDB";
const SESSIONS_COLLECTION = "sessions";
const IMAGES_COLLECTION = "images";
const VIEW_COUNTS_COLLECTION = "viewCounts";
const VIEW_HISTORY_COLLECTION = "viewHistory";

export interface SessionDocument {
  _id?: ObjectId;
  sessionId: string;
  ipAddress: string;
  createdAt: Date;
  lastActive: Date;
}

export interface ImageOwnerDocument {
  _id?: ObjectId;
  imageId: string;
  sessionId: string;
  ipAddress: string;
  createdAt: Date;
}

export interface ViewCountDocument {
  _id?: ObjectId;
  imageId: string;
  count: number;
  updatedAt: Date;
}

export interface ViewHistoryDocument {
  _id?: ObjectId;
  imageId: string;
  viewerHash: string;
  viewedAt: Date;
}

export async function getDb() {
  const client = await getClientPromise();
  return client.db(DB_NAME);
}

export async function createOrUpdateSession(sessionId: string, ipAddress: string): Promise<void> {
  const db = await getDb();
  const sessions = db.collection(SESSIONS_COLLECTION);

  const now = new Date();

  await sessions.updateOne(
    { sessionId },
    {
      $set: {
        lastActive: now,
        ipAddress,
      },
      $setOnInsert: {
        sessionId,
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function getSession(
  sessionId: string,
): Promise<SessionDocument | null> {
  const db = await getDb();
  const sessions = db.collection(SESSIONS_COLLECTION);

  return sessions.findOne({ sessionId }) as Promise<SessionDocument | null>;
}

export async function setImageOwner(
  imageId: string,
  sessionId: string,
  ipAddress: string,
): Promise<void> {
  const db = await getDb();
  const images = db.collection(IMAGES_COLLECTION);

  await images.updateOne(
    { imageId },
    {
      $set: {
        imageId,
        sessionId,
        ipAddress,
        createdAt: new Date(),
      },
    },
    { upsert: true },
  );
}

export async function getImageOwner(imageId: string): Promise<string | null> {
  const db = await getDb();
  const images = db.collection(IMAGES_COLLECTION);

  const result = await images.findOne({ imageId });
  return result ? result.sessionId : null;
}

export async function getUserImages(sessionId: string): Promise<string[]> {
  const db = await getDb();
  const images = db.collection(IMAGES_COLLECTION);

  const results = await images.find({ sessionId }).toArray();
  return results.map((img) => img.imageId);
}

export async function canDeleteImage(
  imageId: string,
  sessionId: string,
): Promise<boolean> {
  const owner = await getImageOwner(imageId);
  return owner === sessionId;
}

export async function deleteImageOwnership(imageId: string): Promise<void> {
  const db = await getDb();
  const images = db.collection(IMAGES_COLLECTION);

  await images.deleteOne({ imageId });
}

export async function deleteAllImageData(imageId: string): Promise<void> {
  const db = await getDb();
  
  const images = db.collection(IMAGES_COLLECTION);
  const viewCounts = db.collection(VIEW_COUNTS_COLLECTION);
  const viewHistory = db.collection(VIEW_HISTORY_COLLECTION);
  
  await Promise.all([
    images.deleteOne({ imageId }),
    viewCounts.deleteOne({ imageId }),
    viewHistory.deleteMany({ imageId }) 
  ]);
  
  console.log(`All data for image ${imageId} deleted from database`);
}

let viewIndexEnsured = false;

export async function incrementViewCount(
  imageId: string,
  viewerHash: string
): Promise<{ counted: boolean; count: number }> {
  const db = await getDb();
  const viewCountsCollection = db.collection(VIEW_COUNTS_COLLECTION);
  const viewHistoryCollection = db.collection(VIEW_HISTORY_COLLECTION);

  // Unique index makes "one view per IP per image" atomic: a duplicate insert
  // throws E11000 instead of racing a check-then-insert. Created once per process.
  if (!viewIndexEnsured) {
    await viewHistoryCollection.createIndex(
      { imageId: 1, viewerHash: 1 },
      { unique: true },
    );
    viewIndexEnsured = true;
  }

  try {
    await viewHistoryCollection.insertOne({
      imageId,
      viewerHash,
      viewedAt: new Date(),
    });
  } catch (error) {
    if ((error as { code?: number }).code === 11000) {
      return { counted: false, count: await getViewCount(imageId) };
    }
    throw error;
  }

  const result = await viewCountsCollection.findOneAndUpdate(
    { imageId },
    {
      $inc: { count: 1 },
      $set: { updatedAt: new Date() },
    },
    {
      upsert: true,
      returnDocument: "after",
    },
  );

  return {
    counted: true,
    count: result?.count ?? 1,
  };
}

export async function getViewCount(imageId: string): Promise<number> {
  const db = await getDb();
  const viewCounts = db.collection(VIEW_COUNTS_COLLECTION);

  const countDoc = await viewCounts.findOne({ imageId });
  return countDoc ? countDoc.count : 0;
}

export async function migrateFromJson(
  imageOwners: Record<string, string>,
  viewCounts: Record<string, number>,
  viewHistory: Record<string, string[]>,
): Promise<void> {
  const db = await getDb();
  const imagesCollection = db.collection(IMAGES_COLLECTION);
  const viewCountsCollection = db.collection(VIEW_COUNTS_COLLECTION);
  const viewHistoryCollection = db.collection(VIEW_HISTORY_COLLECTION);

  const ownerPromises = Object.entries(imageOwners).map(
    ([imageId, sessionId]) => {
      return imagesCollection.updateOne(
        { imageId },
        {
          $set: {
            imageId,
            sessionId,
            createdAt: new Date(),
          },
        },
        { upsert: true },
      );
    },
  );

  const countPromises = Object.entries(viewCounts).map(([imageId, count]) => {
    return viewCountsCollection.updateOne(
      { imageId },
      {
        $set: {
          imageId,
          count,
          updatedAt: new Date(),
        },
      },
      { upsert: true },
    );
  });

  const historyPromises = Object.entries(viewHistory).flatMap(
    ([imageId, hashes]) => {
      return hashes.map((viewerHash) => {
        return viewHistoryCollection.updateOne(
          { imageId, viewerHash },
          {
            $set: {
              imageId,
              viewerHash,
              viewedAt: new Date(),
            },
          },
          { upsert: true },
        );
      });
    },
  );

  await Promise.all([...ownerPromises, ...countPromises, ...historyPromises]);

  console.log("Migration completed successfully");
}
