import { useState } from "react";
import { sendPayment } from "../api";

export default function PaymentPanel() {
    const [amount, setAmount] = useState("");
    const [status, setStatus] = useState("");

    const handleSend = async () => {
        setStatus("Sending...");
        const res = await sendPayment({ from: "user1", to: "user2", amount });
        setStatus(`✅ ${res.message || "Payment sent!"}`);
    };

    return (
        <div className="p-4 bg-white shadow rounded-xl w-80">
            <h2 className="text-lg font-bold mb-2 text-gray-700">💸 Payment</h2>
            <input
                type="number"
                placeholder="Amount"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border p-2 w-full rounded mb-2"
            />
            <button
                onClick={handleSend}
                className="bg-blue-600 text-white px-3 py-2 rounded w-full hover:bg-blue-700"
            >
                Send
            </button>
            {status && <p className="mt-2 text-sm text-gray-600">{status}</p>}
        </div>
    );
}
