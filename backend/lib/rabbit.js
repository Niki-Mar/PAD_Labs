import amqp from 'amqplib';
import dotenv from 'dotenv';
dotenv.config({ path: '../.env' });

export async function createChannel() {
  const connection = await amqp.connect(process.env.RABBIT_URL || 'amqp://guest:guest@localhost:5672');
  const channel = await connection.createChannel();

  process.on('SIGINT', async () => {
    try { await channel.close(); await connection.close(); } catch { }
    process.exit(0);
  });

  return channel;
}

export async function sendLog(service, type, message, payload = {}) {
  const ch = await createChannel();
  await ch.assertQueue('log_queue');
  const logEntry = { service, type, message, payload, createdAt: new Date().toISOString() };
  ch.sendToQueue('log_queue', Buffer.from(JSON.stringify(logEntry)));
}