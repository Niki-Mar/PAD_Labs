import { createChannel } from '../../lib/rabbit.js';
import { pool } from '../../lib/postgres.js';
import { connectMongo } from '../../lib/mongo.js';
import mongoose from 'mongoose';

(async () => {
    // подключаем Mongo
    await connectMongo();

    // создаём модель для уведомлений
    const notificationSchema = new mongoose.Schema({
        user: String,
        message: String,
        createdAt: Date
    });
    const Notification = mongoose.model('Notification', notificationSchema);

    // подключаем RabbitMQ
    const ch = await createChannel();
    const inQueue = 'grandmaster_queue';
    const outQueue = 'response_queue';

    await ch.assertQueue(inQueue);
    await ch.assertQueue(outQueue);
    console.log('[GrandMasterService] waiting for messages...');

    // слушаем очередь
    ch.consume(inQueue, async (msg) => {
        if (!msg) return;
        const data = JSON.parse(msg.content.toString());
        const { user_id } = data;
        console.log('[GrandMasterService] received request for user:', user_id);

        try {
            // 1️⃣ Получаем данные из PostgreSQL
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

            // 2️⃣ Получаем уведомления из MongoDB
            const notifs = await Notification.find({ user: user_id })
                .sort({ createdAt: -1 })
                .limit(10)
                .lean();

            // 3️⃣ Формируем ответ
            const response = {
                user: user.name,
                balance: Number(user.balance),
                notifications: notifs.map(n => n.message),
                lastUpdated: new Date().toISOString()
            };

            // 4️⃣ Отправляем ответ в очередь
            ch.sendToQueue(outQueue, Buffer.from(JSON.stringify(response)));
            console.log(`[GrandMasterService] sent aggregated data for ${user_id}`);
            ch.ack(msg);

        } catch (err) {
            console.error('[GrandMasterService] Error:', err.message);
            ch.nack(msg, false, false);
        }
    });
})();
