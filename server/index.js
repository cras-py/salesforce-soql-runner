const express = require('express');
const cors = require('cors');
const jsforce = require('jsforce');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
app.use(express.json());
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  rolling: true, // Reset expiration on each request
  cookie: { 
    secure: false, 
    httpOnly: true,
    maxAge: 8 * 60 * 60 * 1000 // 8 hours instead of 24
  }
}));

// Store active connections
const connections = new Map();

// Salesforce login endpoint
app.post('/api/login', async (req, res) => {
  try {
    const { username, password, environment, customDomain } = req.body;
    
    let loginUrl;
    if (customDomain) {
      loginUrl = `https://${customDomain}.my.salesforce.com`;
    } else {
      loginUrl = environment === 'sandbox' 
        ? 'https://test.salesforce.com' 
        : 'https://login.salesforce.com';
    }

    const conn = new jsforce.Connection({
      loginUrl: loginUrl
    });

    const userInfo = await conn.login(username, password);
    
    // Store connection in session
    const sessionId = uuidv4();
    connections.set(sessionId, conn);
    req.session.sessionId = sessionId;
    req.session.userInfo = userInfo;

    res.json({
      success: true,
      userInfo: {
        id: userInfo.id,
        organizationId: userInfo.organizationId,
        url: userInfo.url
      },
      sessionId
    });
  } catch (error) {
    console.error('Login error:', error);
    
    let errorMessage = error.message;
    
    // Provide more user-friendly error messages
    if (error.message.includes('LOGIN_MUST_USE_SECURITY_TOKEN')) {
      errorMessage = 'Security token required. Please add your security token to your password or access from a trusted network.';
    } else if (error.message.includes('INVALID_LOGIN')) {
      errorMessage = 'Invalid username or password. Please check your credentials.';
    } else if (error.message.includes('EXCEEDED_ID_LIMIT')) {
      errorMessage = 'Too many login attempts. Please try again later.';
    } else if (error.message.includes('ORGANIZATION_SUSPENDED')) {
      errorMessage = 'Your Salesforce organization is suspended. Please contact your administrator.';
    }
    
    res.status(401).json({
      success: false,
      error: errorMessage
    });
  }
});

// Execute SOQL query
app.post('/api/query', async (req, res) => {
  try {
    const { query, maxRecords } = req.body; // Allow client to specify max records
    const sessionId = req.session.sessionId;
    
    if (!sessionId || !connections.has(sessionId)) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const conn = connections.get(sessionId);
    let result = await conn.query(query);
    
    // Configurable record limit (default 10,000, 0 = unlimited)
    const recordLimit = maxRecords !== undefined ? maxRecords : 10000;
    const isUnlimited = recordLimit === 0;
    
    console.log(`Query execution - Record limit: ${isUnlimited ? 'UNLIMITED' : recordLimit}, maxRecords received: ${maxRecords}`);
    
    // If there are more records, fetch them
    let allRecords = [...result.records];
    let fetchCount = 0;
    const maxFetchIterations = 1000; // Safety limit to prevent infinite loops
    
    while (!result.done && result.nextRecordsUrl) {
      fetchCount++;
      console.log(`Fetching more records... Current count: ${allRecords.length}${isUnlimited ? ' (UNLIMITED MODE)' : ''}`);
      
      // Safety check for unlimited mode
      if (isUnlimited && fetchCount > maxFetchIterations) {
        console.log(`Safety limit reached: ${maxFetchIterations} fetch iterations. Stopping to prevent infinite loop.`);
        break;
      }
      
      result = await conn.queryMore(result.nextRecordsUrl);
      allRecords = allRecords.concat(result.records);
      
      // Check limit (unless unlimited)
      if (!isUnlimited && allRecords.length >= recordLimit) {
        console.log(`Reached ${recordLimit} record limit, stopping fetch`);
        break;
      }
    }

    console.log(`Query completed. Total records fetched: ${allRecords.length}, Total available: ${result.totalSize}${isUnlimited ? ' (UNLIMITED MODE)' : ''}`);

    res.json({
      success: true,
      data: allRecords,
      totalSize: result.totalSize,
      done: allRecords.length >= result.totalSize || (!isUnlimited && allRecords.length >= recordLimit),
      fetchedCount: allRecords.length,
      recordLimit: recordLimit,
      isUnlimited: isUnlimited
    });
  } catch (error) {
    console.error('Query error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get object describe
app.get('/api/describe/:objectName', async (req, res) => {
  try {
    const { objectName } = req.params;
    const sessionId = req.session.sessionId;
    
    if (!sessionId || !connections.has(sessionId)) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const conn = connections.get(sessionId);
    const describe = await conn.sobject(objectName).describe();

    res.json({
      success: true,
      data: describe
    });
  } catch (error) {
    console.error('Describe error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Get all objects
app.get('/api/objects', async (req, res) => {
  try {
    const sessionId = req.session.sessionId;
    
    if (!sessionId || !connections.has(sessionId)) {
      return res.status(401).json({
        success: false,
        error: 'Not authenticated'
      });
    }

    const conn = connections.get(sessionId);
    const describe = await conn.describeGlobal();

    res.json({
      success: true,
      data: describe.sobjects.map(obj => ({
        name: obj.name,
        label: obj.label,
        queryable: obj.queryable
      })).filter(obj => obj.queryable)
    });
  } catch (error) {
    console.error('Objects error:', error);
    res.status(400).json({
      success: false,
      error: error.message
    });
  }
});

// Logout endpoint
app.post('/api/logout', (req, res) => {
  const sessionId = req.session.sessionId;
  if (sessionId && connections.has(sessionId)) {
    connections.delete(sessionId);
  }
  req.session.destroy();
  res.json({ success: true });
});

// Session refresh endpoint
app.post('/api/refresh-session', (req, res) => {
  const sessionId = req.session.sessionId;
  
  if (sessionId && connections.has(sessionId)) {
    // Session is valid, just touching it will refresh the expiration
    req.session.touch();
    res.json({ 
      success: true, 
      message: 'Session refreshed',
      sessionId: sessionId
    });
  } else {
    res.status(401).json({ 
      success: false, 
      error: 'Session not found or expired' 
    });
  }
});

// Check authentication status
app.get('/api/auth-status', (req, res) => {
  const sessionId = req.session.sessionId;
  const isAuthenticated = sessionId && connections.has(sessionId);
  
  // Debug logging
  console.log('Auth status check:', {
    hasSessionId: !!sessionId,
    hasConnection: sessionId ? connections.has(sessionId) : false,
    sessionAge: req.session.cookie.maxAge,
    connectionsCount: connections.size
  });
  
  res.json({
    authenticated: isAuthenticated,
    userInfo: isAuthenticated ? req.session.userInfo : null,
    sessionId: sessionId || null
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
}); 