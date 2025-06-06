# Salesforce SOQL Runner

A comprehensive web application for executing SOQL queries against Salesforce orgs with advanced data inspection and export capabilities.

## Features

### 🔐 Authentication
- **Salesforce Login**: Authenticate using username/password
- **Environment Selection**: Choose between Production and Sandbox
- **Custom Domain Support**: Connect to custom Salesforce domains
- **Session Management**: Secure session handling with automatic logout

### 🔍 Query Execution
- **SOQL Editor**: Full-featured query editor with syntax highlighting
- **Real-time Execution**: Execute queries against your Salesforce org
- **Result Preview**: View query results in a responsive data grid
- **Error Handling**: Clear error messages for debugging

### 📊 Data Inspection
- **Advanced Analytics**: Statistical analysis similar to pandas data wrangler
- **Field Statistics**: Min, max, mean, median for numeric fields
- **Data Quality**: Null count, unique values, duplicates analysis
- **Interactive Filtering**: Filter and sort data with built-in grid controls
- **Top Values**: Most frequent values for categorical data

### 💾 Data Export
- **CSV Export**: Export query results to CSV format
- **Filtered Export**: Export only filtered/selected data
- **Custom File Naming**: Automatic timestamped file names

### 🔖 Query Management
- **Save Queries**: Save frequently used queries with custom names
- **Query Library**: Manage your saved queries with descriptions
- **Quick Access**: Run saved queries with one click
- **Edit & Update**: Modify saved queries as needed

### 🎨 Modern UI
- **Material-UI Design**: Clean, professional interface
- **Responsive Layout**: Works on desktop and mobile devices
- **Dark/Light Theme**: Modern Material Design components
- **Intuitive Navigation**: Easy-to-use sidebar navigation

## Technology Stack

### Backend
- **Node.js** with Express.js
- **JSForce** for Salesforce API integration
- **Express Session** for authentication management
- **CORS** for cross-origin requests

### Frontend
- **React 18** with TypeScript
- **Material-UI (MUI)** for components and styling
- **MUI DataGrid** for advanced data tables
- **React Router** for navigation
- **Axios** for API communication
- **File-saver** for CSV exports

## Installation & Setup

### Prerequisites
- Node.js (v16 or higher)
- npm or yarn
- Salesforce org (Production or Sandbox)

### 1. Clone the Repository
```bash
git clone <repository-url>
cd salesforce-soql-runner
```

### 2. Install Dependencies
```bash
# Install root dependencies
npm install

# Install all dependencies (server + client)
npm run install-all
```

### 3. Environment Configuration
Create a `.env` file in the `server` directory:
```env
PORT=5000
SESSION_SECRET=your-super-secret-session-key-change-this-in-production
NODE_ENV=development
```

### 4. Start the Application
```bash
# Start both server and client in development mode
npm run dev
```

This will start:
- Backend server on `http://localhost:5000`
- Frontend client on `http://localhost:3000`

### 5. Access the Application
Open your browser and navigate to `http://localhost:3000`

## Usage Guide

### 1. Login to Salesforce
1. Choose your environment (Production/Sandbox)
2. Enter your Salesforce username and password
3. Optionally specify a custom domain
4. Click "Sign In"

### 2. Execute SOQL Queries
1. Navigate to "Query Runner"
2. Enter your SOQL query in the editor
3. Click "Execute Query"
4. View results in the data grid below

### 3. Inspect Data
1. After running a query, click "Inspect Data"
2. Use the "Data View" tab for filtering and sorting
3. Use the "Statistics" tab for detailed field analysis
4. Export filtered data as needed

### 4. Save Queries
1. In the Query Runner, click "Save Query"
2. Enter a name and optional description
3. Access saved queries from the "Saved Queries" section
4. Run, edit, or delete saved queries

### 5. Export Data
1. After executing a query, click "Export Data"
2. Choose CSV format
3. File will be automatically downloaded

## API Endpoints

### Authentication
- `POST /api/login` - Authenticate with Salesforce
- `POST /api/logout` - End session
- `GET /api/auth-status` - Check authentication status

### Data Operations
- `POST /api/query` - Execute SOQL query
- `GET /api/objects` - Get list of queryable objects
- `GET /api/describe/:objectName` - Get object metadata

## Security Features

- **Session Management**: Secure server-side sessions
- **CORS Protection**: Configured for localhost development
- **Input Validation**: Query validation and error handling
- **No Credential Storage**: Credentials are not stored locally

## Development

### Project Structure
```
salesforce-soql-runner/
├── server/                 # Backend Express.js application
│   ├── index.js           # Main server file
│   └── package.json       # Server dependencies
├── client/                # Frontend React application
│   ├── src/
│   │   ├── components/    # React components
│   │   ├── contexts/      # React contexts
│   │   └── App.tsx        # Main App component
│   └── package.json       # Client dependencies
├── package.json           # Root package.json
└── README.md             # This file
```

### Available Scripts

```bash
# Development
npm run dev          # Start both server and client
npm run server       # Start only server
npm run client       # Start only client

# Installation
npm run install-all  # Install all dependencies

# Production
npm run build        # Build client for production
```

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## License

MIT License - see LICENSE file for details

## Support

For issues and questions:
1. Check the GitHub issues
2. Create a new issue with detailed description
3. Include error messages and steps to reproduce

## Roadmap

- [ ] Advanced query builder with drag-and-drop
- [ ] Data visualization charts and graphs
- [ ] Bulk data operations
- [ ] Query performance analytics
- [ ] Export to multiple formats (Excel, JSON)
- [ ] Query scheduling and automation
- [ ] Team collaboration features
- [ ] Advanced security with OAuth 2.0 