# RecipeShare 🍳

A scalable, cloud-native multimedia recipe sharing platform built on Microsoft Azure.

## Architecture

| Layer | Technology |
|---|---|
| **Backend** | Azure Functions (Node.js v4) |
| **Frontend** | HTML / CSS / Vanilla JS via Azure Blob Storage Static Website |
| **Media Storage** | Azure Blob Storage |
| **Database (SQL)** | Azure SQL (Relational metadata) |
| **Database (NoSQL)** | **Azure Cosmos DB** (Real-time Notifications) |
| **Workflow Engine** | **Azure Logic Apps** (Event-driven background tasks) |
| **Observability** | Azure Application Insights (`applicationinsights`) |
| **CI/CD** | Git-based workflows (GitHub Actions / Azure DevOps) |

## Project Structure

```
recipe-share/
├── backend/
│   ├── src/
│   │   ├── functions/
│   │   │   ├── auth.js          # Registration & Login logic
│   │   │   ├── recipes.js       # Recipe CRUD & Notification triggers
│   │   │   ├── notifications.js  # Gateway to Cosmos DB Notifications
│   │   │   ├── stats.js         # Dashboard statistics
│   │   │   ├── initDb.js        # Database initialization
│   │   │   └── health.js        # Health check endpoint
│   │   └── utils/
│   │       └── logicAppClient.js # Shared utility for Azure Logic Apps
│   ├── package.json             # Node.js dependencies
│   ├── host.json                # Functions host config
│   └── local.settings.json      # Connection strings (git-ignored)
├── frontend/
│   ├── index.html               # Modern landing page
│   ├── dashboard.html           # User dashboard (private)
│   ├── notifications.html       # Real-time notification center 
│   ├── feed.html                # Global recipe feed
│   ├── login.html               # User authentication
│   ├── register.html            # User registration
│   ├── my-recipes.html          # Personal recipe management
│   ├── recipe-details.html      # Full recipe view
│   ├── 404.html                 # Custom error page
│   └── assets/
│       ├── css/style.css        # Premium design system
│       ├── js/                  # Application logic
│       └── utils/app.js         # Shared utilities & API client
```
├── .gitignore
└── README.md
```

## API Endpoints

| Method | Route | Description |
|---|---|---|
| `POST` | `/api/register` | Create a new user account |
| `POST` | `/api/login` | Authenticate and receive JWT token |
| `POST` | `/api/upload` | Upload media (images/videos) to Blob Storage |
| `POST` | `/api/recipes` | Create a new recipe (Requires JWT) |
| `GET`  | `/api/recipes` | Retrieve all recipes (Optional `userId` query param) |
| `GET`  | `/api/recipes/{id}` | Get specific recipe details with steps |
| `PUT`  | `/api/recipes/{id}` | Update an existing recipe (Requires JWT, Owner only) |
| `DELETE`| `/api/recipes/{id}` | Delete a recipe (Requires JWT, Owner only) |
| `GET`  | `/api/stats` | Get dashboard overview statistics |
| `GET`  | `/api/health` | Service health status check |
| `GET`  | `/api/init-db` | Initialize database schema |

## Database Schema

- **Users** – `Id`, `Username`, `Email`, `PasswordHash`, `CreatedAt`
- **Recipes** – `Id`, `UserId`, `Title`, `Description`, `VideoURL`, `CreatedAt`
- **RecipeSteps** – `Id`, `RecipeId`, `StepNumber`, `Instructions`, `ImageURL`, `CreatedAt`

## Local Development

### Prerequisites

- Node.js 18+
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)

### Backend Setup

```bash
cd backend
npm install
```

Edit `local.settings.json` with your Azure connection strings, then:

```bash
func start
```

### Frontend

Serve the frontend using a local server to ensure proper routing:

```bash
cd frontend
npx serve .
```

## Environment Variables

| Variable | Description |
|---|---|
| `AZURE_STORAGE_CONNECTION_STRING` | Primary connection string for Azure Storage Account |
| `AZURE_STORAGE_ACCOUNT_NAME` | Storage account name for multimedia assets |
| `AZURE_STORAGE_ACCOUNT_KEY` | Storage account access key |
| `BLOB_IMAGES_CONTAINER` | Container name for recipe images (default: `recipe-images`) |
| `BLOB_VIDEOS_CONTAINER` | Container name for recipe videos (default: `recipe-videos`) |
| `SQL_CONNECTION_STRING` | Azure SQL Database connection string |
| `JWT_SECRET` | Secret key for signing and verifying JSON Web Tokens |
| `APPINSIGHTS_INSTRUMENTATIONKEY` | Application Insights instrumentation key for monitoring |
| `LOGIC_APP_NOTIFICATIONS_URL` | Unified endpoint for the Logic App handling notifications (Create/Get/Read) |
