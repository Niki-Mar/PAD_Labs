import { useState } from "react";
import { getHealth } from "../api";

export default function HealthCheck() {
  const [health, setHealth] = useState(null);

  const check = async () => {
    const data = await getHealth();
    setHealth(data);
  };

  return (
    <div className="p-4 bg-white shadow rounded-xl w-80 mt-4">
      <h2 className="text-lg font-bold mb-2 text-gray-700">🔍 Health Check</h2>
      <button
        onClick={check}
        className="bg-green-600 text-white px-3 py-2 rounded w-full hover:bg-green-700"
      >
        Check Status
      </button>
      {health && (
        <pre className="text-xs bg-gray-100 p-2 rounded mt-2">{JSON.stringify(health, null, 2)}</pre>
      )}
    </div>
  );
}
