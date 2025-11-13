import { createChannel } from '../../lib/rabbit.js';
import { pool } from '../../lib/postgres.js';
import { connectMongo } from '../../lib/mongo.js';
import mongoose from 'mongoose';

(async () => {
    await connectMongo();

    const notificationSchema = new mongoose.Schema({
        user: String,
        message: String,
        createdAt: Date
    });
    const Notification = mongoose.model('Notification', notificationSchema);

    const ch = await createChannel();
    const inQueue = 'grandmaster_queue';
    const outQueue = 'response_queue';

    await ch.assertQueue(inQueue);
    await ch.assertQueue(outQueue);
    console.log('[GrandMasterService] waiting for messages...');

    ch.consume(inQueue, async (msg) => {
        if (!msg) return;
        const data = JSON.parse(msg.content.toString());
        const { user_id } = data;
        console.log('[GrandMasterService] received request for user:', user_id);

        try {
            const sql = `
        SELECT u.name, a.balance
        FROM core.users u
        JOIN core.accounts a ON a.user_id = u.id
        WHERE u.external_id = $1
      `;
            const sqlRes = await pool.query(sql, [user_id]);

            if (sqlRes.rowCount === 0) {
                ch.sendToQueue(outQueue, Buffer.from(JSON.stringify({
                    status: 'error',
                    message: `user ${user_id} not found`
                })));
                ch.ack(msg);
                return;
            }

            const user = sqlRes.rows[0];

            const notifs = await Notification.find({ user: user_id })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            const response = {
                user: user.name,
                balance: Number(user.balance),
                notifications: notifs.map(n => n.message),
                lastUpdated: new Date().toISOString()
            };

            ch.sendToQueue(outQueue, Buffer.from(JSON.stringify(response)));
            console.log(`[GrandMasterService] sent aggregated data for ${user_id}`);
            ch.ack(msg);

        } catch (err) {
            console.error('[GrandMasterService] Error:', err.message);
            ch.nack(msg, false, false);
        }
    });
})();
