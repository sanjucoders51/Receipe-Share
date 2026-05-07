const { app } = require("@azure/functions");
const sql = require("mssql");

async function getDbPool() {
  const connStr = process.env.SQL_CONNECTION_STRING;
  if (!connStr) throw new Error("Missing environment variable: SQL_CONNECTION_STRING");
  return await sql.connect(connStr);
}

app.http("initDb", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  route: "init-db",
  handler: async (request, context) => {
    try {
      const pool = await getDbPool();
      
      const createUsersTable = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Users' and xtype='U')
        CREATE TABLE Users (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            Username NVARCHAR(100) UNIQUE NOT NULL,
            Email NVARCHAR(100) UNIQUE NOT NULL,
            PasswordHash NVARCHAR(255) NOT NULL,
            CreatedAt DATETIME DEFAULT GETUTCDATE()
        );
      `;
      
      const createRecipesTable = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='Recipes' and xtype='U')
        CREATE TABLE Recipes (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            UserId INT FOREIGN KEY REFERENCES Users(Id) ON DELETE CASCADE,
            Title NVARCHAR(255) NOT NULL,
            Description NVARCHAR(MAX),
            VideoURL NVARCHAR(MAX),
            CreatedAt DATETIME DEFAULT GETUTCDATE()
        );
      `;
      
      const createRecipeStepsTable = `
        IF NOT EXISTS (SELECT * FROM sysobjects WHERE name='RecipeSteps' and xtype='U')
        CREATE TABLE RecipeSteps (
            Id INT IDENTITY(1,1) PRIMARY KEY,
            RecipeId INT FOREIGN KEY REFERENCES Recipes(Id) ON DELETE CASCADE,
            StepNumber INT,
            Instructions NVARCHAR(MAX),
            ImageURL NVARCHAR(MAX),
            CreatedAt DATETIME DEFAULT GETUTCDATE()
        );
      `;

      await pool.request().query(createUsersTable);
      await pool.request().query(createRecipesTable);
      await pool.request().query(createRecipeStepsTable);

      return {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ message: "Database tables initialized successfully." }),
      };
    } catch (e) {
      return {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          "Access-Control-Allow-Origin": "*",
        },
        body: JSON.stringify({ error: e.message }),
      };
    }
  },
});
