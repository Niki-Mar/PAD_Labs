import express from 'express';
import cors from 'cors';
import { createChannel } from '../lib/rabbit.js';
import { connectMongo } from "../lib/mongo.js";

let mongo;
(async () => {
    mongo = await connectMongo();
})();

const app = express();
app.use(express.json());
let ch;

app.use(cors({
    origin: 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type']
}));

(async () => {
    ch = await createChannel();
    console.log('[Gateway] connected to RabbitMQ');
})();

app.post('/user/create', (req, res) => {
    const { external_id, name, balance } = req.body;
    if (!external_id || !name) {
        return res.status(400).json({ error: 'external_id and name are required' });
    }
    const msg = { external_id, name, balance: balance || 0 };
    ch.sendToQueue('user_queue', Buffer.from(JSON.stringify(msg)));
    console.log('[Gateway] sent to user_queue:', msg);
    res.json({ status: 'queued', msg });
});

app.post('/transfer', (req, res) => {
    const msg = req.body;
    ch.sendToQueue('payment_queue', Buffer.from(JSON.stringify(msg)));
    console.log('[Gateway] sent to payment_queue:', msg);
    res.json({ status: 'queued', msg });
});

app.get('/api/notifications', (req, res) => {
    res.json([
        { id: 1, message: 'Payment processed successfully!' },
        { id: 2, message: 'Balance updated.' },
        { id: 3, message: 'User created successfully!' }
    ]);
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', time: new Date().toISOString() });
});

// 💸 Mock payment endpoint
app.post('/api/payment', (req, res) => {
  const { from, to, amount } = req.body;
  if (!from || !to || !amount) {
    return res.status(400).json({ error: 'Missing payment fields' });
  }

  console.log(`[Gateway] Payment received: ${from} -> ${to}, amount: ${amount}`);

  // временный ответ для UI
  res.json({
    status: 'queued',
    transaction: { from, to, amount },
  });
});

app.listen(3000, () => console.log('🚀 Gateway listening on port 3000'));

app.post('/user/report', async (req, res) => {
    const { user_id } = req.body;
    if (!user_id) return res.status(400).json({ error: 'user_id required' });

    const corrId = Math.random().toString(16).slice(2);
    const replyQueue = 'response_queue';
    const queue = 'grandmaster_queue';

    const responsePromise = new Promise((resolve) => {
        ch.consume(replyQueue, (msg) => {
            const content = JSON.parse(msg.content.toString());
            resolve(content);
            ch.ack(msg);
        }, { noAck: false });
    });

    ch.sendToQueue(queue, Buffer.from(JSON.stringify({ user_id })));
    console.log('[Gateway] sent report request for', user_id);

    const response = await responsePromise;
    res.json(response);

    // app.get("/api/notifications", async (req, res) => {
    //     try {
    //         const collection = mongo.collection("notifications");
    //         const items = await collection
    //             .find({})
    //             .sort({ timestamp: -1 })
    //             .limit(50)
    //             .toArray();
    //         res.json(items);
    //     } catch (err) {
    //         console.error("Error fetching notifications:", err);
    //         res.status(500).json({ error: "Failed to fetch notifications" });
    //     }
    // });

});