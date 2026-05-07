const { app } = require("@azure/functions");

app.http("health", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "health",
  handler: async (request, context) => {
    context.log("Health check triggered");
    
    return {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
      },
      body: JSON.stringify({
        status: "Healthy",
        timestamp: new Date().toISOString(),
        service: "RecipeShare API",
        environment: process.env.NODE_ENV || "production"
      }),
    };
  },
});
