import { MongoClient } from "mongodb";

const uri = process.env.MONGO_URI || "mongodb://bankadmin:banksecret@mongo:27017";
const client = new MongoClient(uri);
let db;

export async function connectMongo() {
    if (!db) {
        await client.connect();
        db = client.db("bankmq");
        console.log("[Mongo] Connected to MongoDB");
    }
    return db;
}
