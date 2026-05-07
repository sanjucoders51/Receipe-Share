const { app } = require("@azure/functions");
const sql = require("mssql");
const bcrypt = require("bcryptjs");
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    },
  };
}

app.http("register", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "register",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") return corsPreflight();

    try {
      const body = await request.json();
      const { username, email, password } = body;

      if (!username || !email || !password) {
        return jsonResponse({ error: "Username, email, and password are required" }, 400);
      }

      const pool = await getDbPool();

      // Check if user exists
      const checkResult = await pool.request()
        .input("username", sql.NVarChar, username)
        .input("email", sql.NVarChar, email)
        .query("SELECT Id FROM Users WHERE Username = @username OR Email = @email");

      if (checkResult.recordset.length > 0) {
        return jsonResponse({ error: "Username or email already exists" }, 409);
      }

      // Hash password
      const salt = await bcrypt.genSalt(10);
      const passwordHash = await bcrypt.hash(password, salt);

      // Insert user
      await pool.request()
        .input("username", sql.NVarChar, username)
        .input("email", sql.NVarChar, email)
        .input("passwordHash", sql.NVarChar, passwordHash)
        .query(`
          INSERT INTO Users (Username, Email, PasswordHash, CreatedAt)
          VALUES (@username, @email, @passwordHash, GETUTCDATE())
        `);

      return jsonResponse({ message: "User registered successfully" }, 201);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  },
});

app.http("login", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "login",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") return corsPreflight();

    try {
      const body = await request.json();
      const { identifier, password } = body;

      if (!identifier || !password) {
        return jsonResponse({ error: "Identifier and password are required" }, 400);
      }

      const pool = await getDbPool();

      const result = await pool.request()
        .input("identifier", sql.NVarChar, identifier)
        .query("SELECT Id, Username, Email, PasswordHash FROM Users WHERE Username = @identifier OR Email = @identifier");

      if (result.recordset.length === 0) {
        return jsonResponse({ error: "Invalid credentials" }, 401);
      }

      const user = result.recordset[0];

      // Verify password
      const validPassword = await bcrypt.compare(password, user.PasswordHash);
      if (!validPassword) {
        return jsonResponse({ error: "Invalid credentials" }, 401);
      }

      // Generate JWT
      const token = jwt.sign({ userId: user.Id, username: user.Username, email: user.Email }, JWT_SECRET, { expiresIn: '7d' });

      return jsonResponse({
        token,
        user: {
          id: user.Id,
          username: user.Username,
          email: user.Email
        }
      });
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  },
});
