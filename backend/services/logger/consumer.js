import { createChannel } from '../../lib/rabbit.js';
import { connectMongo } from '../../lib/mongo.js';
import mongoose from 'mongoose';

(async () => {
    await connectMongo();

    const logSchema = new mongoose.Schema({
        service: String,
        type: String,
        message: String,
        payload: Object,
        createdAt: Date
    });
    const Log = mongoose.model('Log', logSchema);

    const ch = await createChannel();
    const queue = 'log_queue';
    await ch.assertQueue(queue);
    console.log('[LoggerService] waiting for messages...');

    ch.consume(queue, async (msg) => {
        if (!msg) return;
        const data = JSON.parse(msg.content.toString());
        console.log('[LoggerService] received:', data);

        try {
            const log = new Log({
                ...data,
                createdAt: new Date()
            });
            await log.save();
            console.log(`[LoggerService] saved log from ${data.service}`);
            ch.ack(msg);
        } catch (err) {
            console.error('[LoggerService] Error saving log:', err.message);
            ch.nack(msg, false, false);
        }
    });
})();
