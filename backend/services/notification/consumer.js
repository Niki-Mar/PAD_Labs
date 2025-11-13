import { connectMongo } from "../../lib/mongo.js";
import { createChannel } from "../../lib/rabbit.js";

(async () => {
    const ch = await createChannel();
    const db = await connectMongo();
    const collection = db.collection("notifications");

    await ch.assertQueue("notification_queue");
    console.log("[NOTIF] Listening to notification_queue...");

    ch.consume("notification_queue", async (msg) => {
        if (!msg) return;
        const data = JSON.parse(msg.content.toString());
        console.log("[NOTIF] Received:", data);

        await collection.insertOne({
            ...data,
            timestamp: new Date(),
        });

        ch.ack(msg);
    });
})();
