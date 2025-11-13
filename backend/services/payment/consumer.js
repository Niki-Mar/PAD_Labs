import { createChannel } from '../../lib/rabbit.js';
import { pool } from '../../lib/postgres.js';

(async () => {
    const ch = await createChannel();
    const queueIn = 'payment_queue';
    const queueOut = 'notification_queue';
    await ch.assertQueue(queueIn);
    await ch.assertQueue(queueOut);

    console.log('[PaymentService] waiting for messages...');

    ch.consume(queueIn, async (msg) => {
        if (!msg) return;
        const data = JSON.parse(msg.content.toString());
        console.log('[PaymentService] received:', data);

        const { from, to, amount } = data;
        if (!from || !to || !amount || amount <= 0) {
            console.error('[PaymentService] invalid data');
            ch.ack(msg);
            return;
        }

        const client = await pool.connect();
        try {
            await client.query('BEGIN');

            const fromAcc = await client.query(
                `SELECT a.id, a.balance FROM core.accounts a 
         JOIN core.users u ON u.id = a.user_id WHERE u.external_id = $1`,
                [from]
            );
            const toAcc = await client.query(
                `SELECT a.id, a.balance FROM core.accounts a 
         JOIN core.users u ON u.id = a.user_id WHERE u.external_id = $1`,
                [to]
            );

            if (fromAcc.rowCount === 0 || toAcc.rowCount === 0) {
                throw new Error('account not found');
            }

            const fromBalance = Number(fromAcc.rows[0].balance);
            const toBalance = Number(toAcc.rows[0].balance);

            if (fromBalance < amount) {
                throw new Error(`insufficient funds: ${from} has ${fromBalance}`);
            }

            await client.query(
                `UPDATE core.accounts SET balance = $1 WHERE id = $2`,
                [fromBalance - amount, fromAcc.rows[0].id]
            );
            await client.query(
                `UPDATE core.accounts SET balance = $1 WHERE id = $2`,
                [toBalance + amount, toAcc.rows[0].id]
            );

            await client.query(
                `INSERT INTO core.transactions (from_account_id, to_account_id, amount)
         VALUES ($1, $2, $3)`,
                [fromAcc.rows[0].id, toAcc.rows[0].id, amount]
            );

            await client.query('COMMIT');

            console.log(`[PaymentService] transfer completed: ${from} -> ${to} (${amount}$)`);

            const notif = {
                user: to,
                message: `You received ${amount}$ from ${from}`,
                createdAt: new Date().toISOString()
            };
            ch.sendToQueue(queueOut, Buffer.from(JSON.stringify(notif)));

            ch.ack(msg);
        } catch (err) {
            await client.query('ROLLBACK');
            console.error('[PaymentService] Error:', err.message);
            ch.nack(msg, false, false);
        } finally {
            client.release();
        }
    });
})();
