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
- [Node.js 20.x](https://nodejs.org/)
- [Azure Functions Core Tools v4](https://learn.microsoft.com/en-us/azure/azure-functions/functions-run-local)
- [Azure CLI](https://learn.microsoft.com/en-us/cli/azure/install-azure-cli)
- [Visual Studio Code](https://code.visualstudio.com/) with [Live Server](https://marketplace.visualstudio.com/items?itemName=ritwickdey.LiveServer) extension

### Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   npm install
   ```
2. Create a `local.settings.json` file in the `backend/` folder:
   ```json
   {
     "IsEncrypted": false,
     "Values": {
       "AzureWebJobsStorage": "UseDevelopmentStorage=true",
       "FUNCTIONS_WORKER_RUNTIME": "node",
       "AZURE_STORAGE_CONNECTION_STRING": "your_storage_connection_string",
       "SQL_CONNECTION_STRING": "your_sql_connection_string",
       "JWT_SECRET": "your_jwt_secret",
       "LOGIC_APP_NOTIFICATIONS_URL": "your_logic_app_url"
     }
   }
   ```
3. Start the backend:
   ```bash
   func start
   ```

### Frontend Setup
1. Open the project in VS Code.
2. Right-click on `frontend/index.html` and select **"Open with Live Server"**.
3. The frontend will be available at `http://127.0.0.1:5500`.

---

## Deployment

### CI/CD (Automated)
Deployments are handled automatically via GitHub Actions:
- **Frontend Deploy**: Triggered when changes are pushed to `main` within the `frontend/` directory.
- **Backend Deploy**: Triggered when changes are pushed to `main` within the `backend/` directory.

You can also trigger these workflows manually from the **Actions** tab in GitHub.

### Manual Deployment
If you need to deploy manually from your local machine, use the provided shell scripts:

#### 1. Frontend Deployment
Ensure you have your Azure Storage Key available:
```bash
AZURE_STORAGE_KEY="your_key_here" ./deploy-frontend.sh
```

#### 2. Backend Deployment
Ensure you are logged into Azure CLI (`az login`) first:
```bash
./deploy-backend.sh
```

---

## Live URLs

- **Frontend**: [https://recipesharestorage.z36.web.core.windows.net](https://recipesharestorage.z36.web.core.windows.net)
- **Backend API**: [https://recipeshare-api.polandcentral-01.azurewebsites.net](https://recipeshare-api.polandcentral-01.azurewebsites.net)

---

## GitHub Actions Secrets
The following secrets must be configured in your GitHub repository for CI/CD to function:

| Secret Name | Description |
|---|---|
| `AZURE_USERNAME` | Azure portal login email |
| `AZURE_PASSWORD` | Azure portal password |
| `AZURE_FUNCTIONAPP_NAME` | `recipeshare-api` |
| `AZURE_STORAGE_ACCOUNT` | `recipesharestorage` |
| `AZURE_STORAGE_KEY` | Storage account access key |

## Environment Variables (Local)
The following environment variables must be set in your `local.settings.json` (for backend) or local environment for the application to function:

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
| `LOGIC_APP_NOTIFICATIONS_URL` | Unified endpoint for the Logic App handling notifications |
