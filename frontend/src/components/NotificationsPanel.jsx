import { useEffect, useState } from "react";
import { getNotifications } from "../api";

export default function NotificationsPanel() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(false);

    // каждые 5 секунд обновляем уведомления
    useEffect(() => {
        const fetchNotifications = async () => {
            setLoading(true);
            try {
                const data = await getNotifications();
                setNotifications(data);
            } catch (err) {
                console.error("Failed to load notifications:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchNotifications();
        const interval = setInterval(fetchNotifications, 5000);
        return () => clearInterval(interval);
    }, []);

    return (
        <div className="p-4 bg-white shadow rounded-xl w-96 mt-4">
            <h2 className="text-lg font-bold mb-2 text-gray-700">🔔 Notifications</h2>
            {loading && <p className="text-sm text-gray-500">Loading...</p>}
            <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                    <p className="text-sm text-gray-500">No notifications yet.</p>
                ) : (
                    notifications.map((n, i) => (
                        <div
                            key={i}
                            className="border-b border-gray-100 py-2 text-sm text-gray-700"
                        >
                            <p>
                                <b>{n.type || "Event"}:</b> {n.message || JSON.stringify(n)}
                            </p>
                            {n.timestamp && (
                                <p className="text-xs text-gray-400">
                                    {new Date(n.timestamp).toLocaleTimeString()}
                                </p>
                            )}
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
