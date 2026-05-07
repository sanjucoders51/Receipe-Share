const { app } = require("@azure/functions");
const jwt = require("jsonwebtoken");
const { triggerLogicApp } = require("../utils/logicAppClient");

const JWT_SECRET = process.env.JWT_SECRET || "r1e2c3i4p5e6s7h8a9r0e";

function jsonResponse(body, statusCode = 200) {
  return {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    body: JSON.stringify(body),
  };
}

function corsPreflight() {
  return {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, PUT, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  };
}

function getUserIdFromToken(request) {
  const authHeader = request.headers.get("authorization");
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    throw new Error("Missing or invalid Authorization header");
  }
  const token = authHeader.split(" ")[1];
  const decoded = jwt.verify(token, JWT_SECRET);
  return decoded.userId;
}

app.http("notifications", {
  methods: ["GET", "PUT", "OPTIONS"],
  authLevel: "anonymous",
  route: "notifications/{id?}",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") return corsPreflight();

    try {
      const userId = getUserIdFromToken(request);
      const notificationId = request.params.id;

      // GET - Fetch notifications via Logic App (from Cosmos DB)
      if (request.method === "GET") {
        const logicAppUrl = process.env.LOGIC_APP_NOTIFICATIONS_URL;
        
        const response = await fetch(logicAppUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ action: "get", userId })
        });
        
        const notifications = await response.json();
        return jsonResponse(notifications);
      }

      // PUT - Mark as read via Logic App (in Cosmos DB)
      if (request.method === "PUT") {
        if (!notificationId) return jsonResponse({ error: "Notification ID required" }, 400);
        
        const logicAppUrl = process.env.LOGIC_APP_NOTIFICATIONS_URL;
        await triggerLogicApp(logicAppUrl, { action: "read", userId, notificationId });
        
        return jsonResponse({ message: "Notification update triggered" });
      }

    } catch (e) {
      return jsonResponse({ error: e.message }, e.message.includes("Authorization") ? 401 : 500);
    }
  },
});
