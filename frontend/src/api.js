const API_BASE = import.meta.env.VITE_API_URL || "http://localhost:3000";

export async function sendPayment(data) {
    const res = await fetch(`${API_BASE}/api/payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return res.json();
}

export async function getHealth() {
    const res = await fetch(`${API_BASE}/health`);
    return res.json();
}

export async function getNotifications() {
    const res = await fetch(`${API_BASE}/api/notifications`);
    if (!res.ok) throw new Error("Failed to fetch notifications");
    return res.json();
}
