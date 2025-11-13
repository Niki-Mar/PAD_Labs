import { createChannel } from '../../lib/rabbit.js';
import { pool } from '../../lib/postgres.js';

(async () => {
    const ch = await createChannel();
    const queue = 'user_queue';
    await ch.assertQueue(queue);
    console.log('[UserService] waiting for messages...');

    ch.consume(queue, async (msg) => {
        if (!msg) return;
        const data = JSON.parse(msg.content.toString());
        console.log('[UserService] received message:', data);

        try {
            const { external_id, name, balance = 0 } = data;
            if (!external_id || !name) throw new Error('Invalid user data');

            // создаём пользователя
            const insertUser = `
        INSERT INTO core.users (external_id, name)
        VALUES ($1, $2)
        ON CONFLICT (external_id) DO NOTHING
        RETURNING id;
      `;
            const userRes = await pool.query(insertUser, [external_id, name]);
            const userId = userRes.rows[0]?.id;

            // если пользователь уже существует, просто обновим баланс
            if (!userId) {
                console.log(`[UserService] user ${external_id} already exists`);
                ch.ack(msg);
                return;
            }

            // создаём счёт
            const insertAccount = `
        INSERT INTO core.accounts (user_id, currency, balance)
        VALUES ($1, 'USD', $2)
      `;
            await pool.query(insertAccount, [userId, balance]);

            console.log(`[UserService] created user ${name} with balance ${balance}$`);
            ch.ack(msg);

        } catch (err) {
            console.error('[UserService] Error:', err.message);
            ch.nack(msg, false, false); // не повторяем
        }
    });
})();
