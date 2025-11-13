import { useState, useEffect } from "react";

const API = "http://localhost:3000";

export default function App() {
  const [users, setUsers] = useState([]);
  const [liveNotifications, setLiveNotifications] = useState([]);
  const [localNotifications, setLocalNotifications] = useState([]);
  const [health, setHealth] = useState("unknown");

  const [selectedSender, setSelectedSender] = useState(null);
  const [selectedReceiver, setSelectedReceiver] = useState("");
  const [amount, setAmount] = useState("");

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const res = await fetch(`${API}/api/notifications`);
        const data = await res.json();
        setLiveNotifications(data);
      } catch {
        setLiveNotifications([{ message: "⚠️ Failed to load notifications" }]);
      }
    };
    loadNotifications();
    const interval = setInterval(loadNotifications, 8000);
    return () => clearInterval(interval);
  }, []);

  const createUser = async () => {
    const id = users.length + 1;
    const name = `User_${id}`;
    try {
      const res = await fetch(`${API}/user/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ external_id: name, name, balance: 1000 }),
      });
      const data = await res.json();
      if (data.status === "queued") {
        setUsers((u) => [...u, { name, balance: 1000, history: [] }]);
        setLocalNotifications((n) => [...n, { message: `👤 Created ${name}` }]);
      }
    } catch {
      alert("❌ Failed to create user");
    }
  };

  const sendPayment = async () => {
    if (!selectedSender || !selectedReceiver || !amount) {
      alert("Заполни все поля!");
      return;
    }

    try {
      const res = await fetch(`${API}/api/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          from: selectedSender,
          to: selectedReceiver,
          amount: Number(amount),
        }),
      });

      const data = await res.json();
      if (data.status === "queued") {
        setUsers((users) =>
          users.map((u) => {
            if (u.name === selectedSender) {
              return {
                ...u,
                balance: u.balance - Number(amount),
                history: [
                  `📤 Sent ${amount} to ${selectedReceiver}`,
                  ...u.history,
                ],
              };
            }
            if (u.name === selectedReceiver) {
              return {
                ...u,
                balance: u.balance + Number(amount),
                history: [
                  `📥 Received ${amount} from ${selectedSender}`,
                  ...u.history,
                ],
              };
            }
            return u;
          })
        );

        setLocalNotifications((n) => [
          ...n,
          { message: `💸 ${selectedSender} → ${selectedReceiver}: ${amount}` },
          { message: `✅ ${selectedReceiver} received ${amount}` },
        ]);

        // Очистить форму
        setAmount("");
        setSelectedSender(null);
        setSelectedReceiver("");
      }
    } catch {
      alert("❌ Payment failed");
    }
  };

  const checkHealth = async () => {
    try {
      const res = await fetch(`${API}/health`);
      const data = await res.json();
      setHealth(data.status === "ok" ? "🟢 ok" : "🔴 error");
      setLocalNotifications((n) => [
        ...n,
        { message: `System Health: ${data.status}` },
      ]);
    } catch {
      setHealth("🔴 offline");
      setLocalNotifications((n) => [
        ...n,
        { message: "❌ Gateway unreachable" },
      ]);
    }
  };

  return (
    <div className="p-8 min-h-screen bg-gray-50 text-gray-900">
      <h1 className="text-3xl font-bold mb-4">🏦 BankMQ Dashboard</h1>

      <button
        onClick={createUser}
        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
      >
        + Create User
      </button>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        {users.map((u) => (
          <div key={u.name} className="p-4 bg-white rounded shadow">
            <h2 className="font-bold text-lg">{u.name}</h2>
            <p className="text-sm text-gray-600 mb-2">Balance: {u.balance}</p>

            <div className="mt-3">
              <button
                onClick={() => setSelectedSender(u.name)}
                className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded"
              >
                💸 Send Payment
              </button>
            </div>

            {u.history.length > 0 && (
              <div className="mt-3 border-t pt-2 text-sm">
                <p className="font-semibold mb-1">📜 History:</p>
                <ul className="space-y-1">
                  {u.history.slice(0, 3).map((h, i) => (
                    <li key={i} className="text-gray-700">
                      {h}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {selectedSender && (
        <div className="fixed inset-0 bg-black bg-opacity-30 flex items-center justify-center">
          <div className="bg-white rounded-lg shadow p-6 w-80">
            <h2 className="font-bold mb-3 text-lg">
              💸 Transfer from {selectedSender}
            </h2>

            <label className="block mb-2 text-sm">
              To:
              <select
                value={selectedReceiver}
                onChange={(e) => setSelectedReceiver(e.target.value)}
                className="border rounded w-full p-1 mt-1"
              >
                <option value="">Select user</option>
                {users
                  .filter((u) => u.name !== selectedSender)
                  .map((u) => (
                    <option key={u.name} value={u.name}>
                      {u.name}
                    </option>
                  ))}
              </select>
            </label>

            <label className="block mb-2 text-sm">
              Amount:
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="border rounded w-full p-1 mt-1"
              />
            </label>

            <div className="flex justify-end gap-2 mt-3">
              <button
                onClick={() => setSelectedSender(null)}
                className="px-3 py-1 bg-gray-300 text-white rounded"
              >
                Cancel
              </button>
              <button
                onClick={sendPayment}
                className="px-3 py-1 bg-green-600 text-white rounded"
              >
                Send
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-10 border-t pt-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-lg">📢 Notifications</h2>
          <button
            onClick={checkHealth}
            className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded"
          >
            ⚙️ Check System Health
          </button>
        </div>

        <div className="space-y-1">
          {[...localNotifications, ...liveNotifications].map((n, i) => (
            <div key={i} className="bg-white p-2 rounded shadow-sm">
              {n.message}
            </div>
          ))}
        </div>

        <p className="text-sm mt-3">
          <strong>System Status:</strong> {health}
        </p>
      </div>
    </div>
  );
}
