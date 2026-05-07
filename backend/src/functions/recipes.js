const { app } = require("@azure/functions");
const { BlobServiceClient } = require("@azure/storage-blob");
const sql = require("mssql");
const { v4: uuidv4 } = require("uuid");
const path = require("path");
const jwt = require("jsonwebtoken");

const JWT_SECRET = process.env.JWT_SECRET || "r1e2c3i4p5e6s7h8a9r0e";

const logger = {
  info: (...args) => console.log("[RecipeShare]", ...args),
  error: (...args) => console.error("[RecipeShare]", ...args),
};

function getBlobServiceClient() {
  const connStr = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connStr) throw new Error("Missing environment variable: AZURE_STORAGE_CONNECTION_STRING");
  return BlobServiceClient.fromConnectionString(connStr);
}

let _pool = null;
async function getDbPool() {
  if (_pool) return _pool;
  const connStr = process.env.SQL_CONNECTION_STRING;
  if (!connStr) throw new Error("Missing environment variable: SQL_CONNECTION_STRING");
  _pool = await sql.connect(connStr);
  return _pool;
}

function jsonResponse(body, statusCode = 200) {
  return {
    status: statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
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

app.http("uploadMedia", {
  methods: ["POST", "OPTIONS"],
  authLevel: "anonymous",
  route: "upload",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") return corsPreflight();

    try {
      const formData = await request.formData();
      const file = formData.get("file");

      if (!file || typeof file === "string") {
        return jsonResponse({ error: "No file provided." }, 400);
      }

      const originalFilename = file.name || "unnamed";
      const contentType = file.type || "application/octet-stream";
      const isVideo = contentType.startsWith("video/");

      const extension = path.extname(originalFilename);
      const blobName = `${uuidv4().replace(/-/g, "")}${extension}`;

      const containerName = isVideo
        ? (process.env.BLOB_VIDEOS_CONTAINER || "recipe-videos")
        : (process.env.BLOB_IMAGES_CONTAINER || "recipe-images");

      const blobServiceClient = getBlobServiceClient();
      const containerClient = blobServiceClient.getContainerClient(containerName);

      try {
        await containerClient.getProperties();
      } catch (_) {
        await containerClient.create({ access: "blob" });
      }

      const blobClient = containerClient.getBlockBlobClient(blobName);
      const fileBuffer = Buffer.from(await file.arrayBuffer());

      await blobClient.uploadData(fileBuffer, {
        overwrite: true,
        blobHTTPHeaders: { blobContentType: contentType },
      });

      return jsonResponse({ url: blobClient.url }, 201);
    } catch (e) {
      return jsonResponse({ error: e.message }, 500);
    }
  },
});

app.http("recipes", {
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  authLevel: "anonymous",
  route: "recipes/{id?}",
  handler: async (request, context) => {
    if (request.method === "OPTIONS") return corsPreflight();

    const recipeId = request.params.id;

    // CREATE (POST)
    if (request.method === "POST") {
      try {
        const userId = getUserIdFromToken(request);
        const body = await request.json();
        const { title, description, videoUrl, steps } = body;

        if (!title) return jsonResponse({ error: "Field 'title' is required." }, 400);

        const pool = await getDbPool();
        const recipeResult = await pool.request()
          .input("userId", sql.Int, userId)
          .input("title", sql.NVarChar, title)
          .input("description", sql.NVarChar, description || "")
          .input("videoUrl", sql.NVarChar, videoUrl || "")
          .query(`
            INSERT INTO Recipes (UserId, Title, Description, VideoURL, CreatedAt)
            OUTPUT INSERTED.Id
            VALUES (@userId, @title, @description, @videoUrl, GETUTCDATE())
          `);

        const newId = recipeResult.recordset[0].Id;

        if (steps && Array.isArray(steps)) {
          for (const step of steps) {
            await pool.request()
              .input("recipeId", sql.Int, newId)
              .input("stepNumber", sql.Int, step.stepNumber || 0)
              .input("instructions", sql.NVarChar, step.instructions || "")
              .input("imageUrl", sql.NVarChar, step.imageUrl || "")
              .query(`
                INSERT INTO RecipeSteps (RecipeId, StepNumber, Instructions, ImageURL, CreatedAt)
                VALUES (@recipeId, @stepNumber, @instructions, @imageUrl, GETUTCDATE())
              `);
          }
        }

        // Trigger Logic App Workflow: New Recipe Notification
        const { triggerLogicApp } = require("../utils/logicAppClient");
        const logicAppUrl = process.env.LOGIC_APP_NOTIFICATIONS_URL;

        // Fire and forget
        triggerLogicApp(logicAppUrl, {
          action: "create",
          recipeId: newId,
          userId: userId,
          title: title,
          description: description,
          videoUrl: videoUrl,
          createdAt: new Date().toISOString()
        });

        return jsonResponse({ id: newId, message: "Recipe created successfully" }, 201);
      } catch (e) {
        return jsonResponse({ error: e.message }, e.message.includes("Authorization") ? 401 : 500);
      }
    }

    // UPDATE (PUT)
    if (request.method === "PUT") {
      try {
        if (!recipeId) return jsonResponse({ error: "Recipe ID is required in route." }, 400);
        const userId = getUserIdFromToken(request);
        const body = await request.json();
        const { title, description, videoUrl, steps } = body;

        if (!title) return jsonResponse({ error: "Field 'title' is required." }, 400);

        const pool = await getDbPool();
        const verify = await pool.request()
          .input("id", sql.Int, recipeId)
          .input("userId", sql.Int, userId)
          .query("SELECT Id FROM Recipes WHERE Id = @id AND UserId = @userId");

        if (verify.recordset.length === 0) return jsonResponse({ error: "Not found or no permission" }, 403);

        await pool.request()
          .input("id", sql.Int, recipeId)
          .input("title", sql.NVarChar, title)
          .input("description", sql.NVarChar, description || "")
          .input("videoUrl", sql.NVarChar, videoUrl || "")
          .query("UPDATE Recipes SET Title=@title, Description=@description, VideoURL=@videoUrl WHERE Id=@id");

        await pool.request().input("id", sql.Int, recipeId).query("DELETE FROM RecipeSteps WHERE RecipeId=@id");

        if (steps && Array.isArray(steps)) {
          for (const step of steps) {
            await pool.request()
              .input("recipeId", sql.Int, recipeId)
              .input("stepNumber", sql.Int, step.stepNumber || 0)
              .input("instructions", sql.NVarChar, step.instructions || "")
              .input("imageUrl", sql.NVarChar, step.imageUrl || "")
              .query(`
                INSERT INTO RecipeSteps (RecipeId, StepNumber, Instructions, ImageURL, CreatedAt)
                VALUES (@recipeId, @stepNumber, @instructions, @imageUrl, GETUTCDATE())
              `);
          }
        }
        return jsonResponse({ id: recipeId, message: "Recipe updated successfully" });
      } catch (e) {
        return jsonResponse({ error: e.message }, e.message.includes("Authorization") ? 401 : 500);
      }
    }

    // DELETE
    if (request.method === "DELETE") {
      try {
        if (!recipeId) return jsonResponse({ error: "Recipe ID is required in route." }, 400);
        const userId = getUserIdFromToken(request);
        const pool = await getDbPool();
        const verify = await pool.request()
          .input("id", sql.Int, recipeId)
          .input("userId", sql.Int, userId)
          .query("SELECT Id FROM Recipes WHERE Id = @id AND UserId = @userId");

        if (verify.recordset.length === 0) return jsonResponse({ error: "Not found or no permission" }, 403);

        await pool.request().input("id", sql.Int, recipeId).query("DELETE FROM Recipes WHERE Id=@id");
        return jsonResponse({ message: "Recipe deleted successfully" });
      } catch (e) {
        return jsonResponse({ error: e.message }, e.message.includes("Authorization") ? 401 : 500);
      }
    }

    // LIST (GET)
    if (request.method === "GET") {
      try {
        const pool = await getDbPool();
        const userIdQuery = request.query.get("userId");

        let query = "SELECT r.*, u.Username FROM Recipes r LEFT JOIN Users u ON r.UserId = u.Id";
        const req = pool.request();
        if (recipeId) {
          query += " WHERE r.Id = @id";
          req.input("id", sql.Int, recipeId);
        } else if (userIdQuery) {
          query += " WHERE r.UserId = @userId";
          req.input("userId", sql.Int, parseInt(userIdQuery));
        }
        query += " ORDER BY r.CreatedAt DESC";

        const result = await req.query(query);
        const recipes = result.recordset.map(r => ({
          id: r.Id,
          userId: r.UserId,
          title: r.Title,
          description: r.Description,
          videoUrl: r.VideoURL,
          createdAt: r.CreatedAt,
          user: { username: r.Username },
          steps: []
        }));

        if (recipes.length > 0) {
          const stepsResult = await pool.request().query("SELECT * FROM RecipeSteps ORDER BY StepNumber ASC");
          recipes.forEach(recipe => {
            recipe.steps = stepsResult.recordset
              .filter(s => s.RecipeId === recipe.id)
              .map(s => ({ stepNumber: s.StepNumber, instructions: s.Instructions, imageUrl: s.ImageURL }));
          });
        }

        return jsonResponse(recipeId ? recipes[0] : recipes);
      } catch (e) {
        return jsonResponse({ error: e.message }, 500);
      }
    }
  }
});
