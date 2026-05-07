const { app } = require("@azure/functions");
const sql = require("mssql");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "r1e2c3i4p5e6s7h8a9r0e";

async function getDbPool() {
  const connStr = process.env.SQL_CONNECTION_STRING;
  if (!connStr) throw new Error("Missing environment variable: SQL_CONNECTION_STRING");
  return await sql.connect(connStr);
}

function jsonResponse(body, statusCode = 200) {
  return {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
    body: JSON.stringify(body),
  };
}

app.http("getStats", {
  methods: ["GET", "OPTIONS"],
  authLevel: "anonymous",
  route: "stats",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") {
      return jsonResponse({}, 204);
    }

    try {
      const authHeader = request.headers.get("authorization");
      let userId = null;
      if (authHeader && authHeader.startsWith("Bearer ")) {
        const token = authHeader.split(" ")[1];
        try {
          const decoded = jwt.verify(token, JWT_SECRET);
          userId = decoded.userId;
        } catch (e) {
          // Token invalid, ignore or return error. We just won't have My Recipes count.
        }
      }

      const pool = await getDbPool();

      const totalRecipesResult = await pool.request().query("SELECT COUNT(*) AS count FROM Recipes");
      const totalRecipes = totalRecipesResult.recordset[0].count;

      const totalUsersResult = await pool.request().query("SELECT COUNT(*) AS count FROM Users");
      const totalUsers = totalUsersResult.recordset[0].count;

      const videosUploadedResult = await pool.request().query("SELECT COUNT(*) AS count FROM Recipes WHERE VideoURL IS NOT NULL AND VideoURL != ''");
      const videosUploaded = videosUploadedResult.recordset[0].count;

      let myRecipesCount = 0;
      if (userId) {
        const myRecipesResult = await pool.request()
          .input("userId", sql.Int, userId)
          .query("SELECT COUNT(*) AS count FROM Recipes WHERE UserId = @userId");
        myRecipesCount = myRecipesResult.recordset[0].count;
      }

      return jsonResponse({
        totalRecipes,
        totalUsers,
        videosUploaded,
        myRecipesCount
      });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  },
});
