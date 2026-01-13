import express from 'express';
import cors from 'cors';
import session from 'express-session';
import passport from 'passport';
import { Strategy as GoogleStrategy } from 'passport-google-oauth20';
import dotenv from 'dotenv';
import Database from 'better-sqlite3';
import pg from 'pg';
import mysql from 'mysql2/promise';
import OpenAI from 'openai';
import path from 'path';
import { fileURLToPath } from 'url';
import { Firestore } from '@google-cloud/firestore';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Frontend path - works both locally (../frontend) and in Docker (./frontend)
const FRONTEND_PATH = process.env.NODE_ENV === 'production'
  ? path.join(__dirname, 'frontend')
  : path.join(__dirname, '../frontend');

const app = express();
const PORT = process.env.PORT || 5000;

// Development mode - skip auth if Google credentials not configured
const DEV_MODE = !process.env.GOOGLE_CLIENT_ID || !process.env.GOOGLE_CLIENT_SECRET;
const devUser = {
  id: 'dev-user-123',
  email: 'developer@localhost',
  name: 'Developer',
  picture: null
};

// Database state
const dbState = {
  connected: false,
  connectionString: null,
  dbType: null,
  connection: null,
  schema: null,
  documentation: {}
};

// OpenAI client (optional)
let openai = null;
if (process.env.OPENAI_API_KEY) {
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

// Firestore for persistent waitlist storage
const firestore = new Firestore({
  projectId: 'striking-loop-447915-q3'
});
const waitlistCollection = firestore.collection('waitlist');

// Middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));
app.use(cors({
  origin: function(origin, callback) {
    // Allow requests with no origin (like file:// or mobile apps)
    if (!origin) return callback(null, true);
    // Allow localhost origins
    if (origin.startsWith('http://localhost') || origin.startsWith('file://')) {
      return callback(null, true);
    }
    // Allow configured frontend URL
    if (process.env.FRONTEND_URL && origin === process.env.FRONTEND_URL) {
      return callback(null, true);
    }
    callback(null, true); // Allow all in dev mode
  },
  credentials: true,
  methods: ['GET', 'POST', 'OPTIONS']
}));

// Serve frontend static files
app.use(express.static(FRONTEND_PATH));

app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key-change-in-production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 24 * 60 * 60 * 1000 // 24 hours
  }
}));

app.use(passport.initialize());
app.use(passport.session());

// Passport Google OAuth configuration (only if credentials are provided)
if (!DEV_MODE) {
  passport.use(new GoogleStrategy({
    clientID: process.env.GOOGLE_CLIENT_ID,
    clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback',
    proxy: true // Trust proxy for Cloud Run (https behind load balancer)
  }, (accessToken, refreshToken, profile, done) => {
    // In a real app, you'd save/lookup user in database
    const user = {
      id: profile.id,
      email: profile.emails[0].value,
      name: profile.displayName,
      picture: profile.photos[0]?.value
    };
    return done(null, user);
  }));
}

// Trust proxy for Cloud Run (needed for secure cookies and OAuth callbacks)
app.set('trust proxy', true);

passport.serializeUser((user, done) => {
  done(null, user);
});

passport.deserializeUser((user, done) => {
  done(null, user);
});

// Auth middleware
const requireAuth = (req, res, next) => {
  // In dev mode, always authenticate
  if (DEV_MODE) {
    req.user = devUser;
    return next();
  }
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: 'Authentication required' });
};

// Auth routes
const getRedirectUrl = () => process.env.FRONTEND_URL || '/';

// /login route - redirects to Google OAuth
app.get('/login', (req, res) => {
  res.redirect('/auth/google');
});

app.get('/auth/google', (req, res, next) => {
  if (DEV_MODE) {
    // In dev mode, auto-login and redirect
    req.login(devUser, (err) => {
      if (err) return next(err);
      res.redirect(getRedirectUrl());
    });
  } else {
    passport.authenticate('google', { scope: ['profile', 'email'] })(req, res, next);
  }
});

app.get('/auth/google/callback', (req, res, next) => {
  if (DEV_MODE) {
    res.redirect(getRedirectUrl());
  } else {
    passport.authenticate('google', { failureRedirect: '/login-failed' })(req, res, () => {
      res.redirect(getRedirectUrl());
    });
  }
});

app.get('/auth/logout', (req, res) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ error: 'Logout failed' });
    }
    res.json({ message: 'Logged out successfully' });
  });
});

app.get('/auth/user', (req, res) => {
  // In dev mode, always return dev user
  if (DEV_MODE) {
    return res.json({ user: devUser });
  }
  if (req.isAuthenticated()) {
    res.json({ user: req.user });
  } else {
    res.json({ user: null });
  }
});

// Database helper functions
function getDbType(connectionString) {
  if (connectionString.startsWith('sqlite:')) return 'sqlite';
  if (connectionString.startsWith('postgresql:') || connectionString.startsWith('postgres:')) return 'postgresql';
  if (connectionString.startsWith('mysql:')) return 'mysql';
  return null;
}

async function connectToDatabase(connectionString) {
  const dbType = getDbType(connectionString);

  if (dbType === 'sqlite') {
    const dbPath = connectionString.replace('sqlite:///', '').replace('sqlite:', '');
    const db = new Database(dbPath);
    return { type: 'sqlite', connection: db };
  }

  if (dbType === 'postgresql') {
    const pool = new pg.Pool({ connectionString });
    await pool.query('SELECT 1'); // Test connection
    return { type: 'postgresql', connection: pool };
  }

  if (dbType === 'mysql') {
    const connection = await mysql.createConnection(connectionString.replace('mysql://', ''));
    await connection.query('SELECT 1'); // Test connection
    return { type: 'mysql', connection };
  }

  throw new Error('Unsupported database type');
}

async function executeQuery(query, params = []) {
  const { type, connection } = { type: dbState.dbType, connection: dbState.connection };

  if (type === 'sqlite') {
    const stmt = connection.prepare(query);
    if (query.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(...params);
    }
    return stmt.run(...params);
  }

  if (type === 'postgresql') {
    const result = await connection.query(query, params);
    return result.rows;
  }

  if (type === 'mysql') {
    const [rows] = await connection.query(query, params);
    return rows;
  }
}

async function getSchema() {
  const schema = { tables: {} };
  const { type, connection } = { type: dbState.dbType, connection: dbState.connection };

  if (type === 'sqlite') {
    const tables = connection.prepare("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'").all();

    for (const table of tables) {
      const columns = connection.prepare(`PRAGMA table_info(${table.name})`).all();
      const foreignKeys = connection.prepare(`PRAGMA foreign_key_list(${table.name})`).all();
      const rowCount = connection.prepare(`SELECT COUNT(*) as count FROM ${table.name}`).get();
      const sampleData = connection.prepare(`SELECT * FROM ${table.name} LIMIT 5`).all();

      schema.tables[table.name] = {
        columns: columns.map(col => ({
          name: col.name,
          type: col.type,
          nullable: !col.notnull,
          primaryKey: col.pk === 1
        })),
        foreignKeys: foreignKeys.map(fk => ({
          column: fk.from,
          references: { table: fk.table, column: fk.to }
        })),
        rowCount: rowCount.count,
        sampleData
      };
    }
  }

  if (type === 'postgresql') {
    const tablesResult = await connection.query(`
      SELECT table_name FROM information_schema.tables
      WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    `);

    for (const row of tablesResult.rows) {
      const tableName = row.table_name;

      const columnsResult = await connection.query(`
        SELECT column_name, data_type, is_nullable,
               (SELECT EXISTS (
                 SELECT 1 FROM information_schema.table_constraints tc
                 JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
                 WHERE tc.table_name = c.table_name AND tc.constraint_type = 'PRIMARY KEY' AND kcu.column_name = c.column_name
               )) as is_primary
        FROM information_schema.columns c WHERE table_name = $1
      `, [tableName]);

      const fkResult = await connection.query(`
        SELECT kcu.column_name, ccu.table_name AS foreign_table, ccu.column_name AS foreign_column
        FROM information_schema.table_constraints tc
        JOIN information_schema.key_column_usage kcu ON tc.constraint_name = kcu.constraint_name
        JOIN information_schema.constraint_column_usage ccu ON tc.constraint_name = ccu.constraint_name
        WHERE tc.table_name = $1 AND tc.constraint_type = 'FOREIGN KEY'
      `, [tableName]);

      const countResult = await connection.query(`SELECT COUNT(*) as count FROM "${tableName}"`);
      const sampleResult = await connection.query(`SELECT * FROM "${tableName}" LIMIT 5`);

      schema.tables[tableName] = {
        columns: columnsResult.rows.map(col => ({
          name: col.column_name,
          type: col.data_type,
          nullable: col.is_nullable === 'YES',
          primaryKey: col.is_primary
        })),
        foreignKeys: fkResult.rows.map(fk => ({
          column: fk.column_name,
          references: { table: fk.foreign_table, column: fk.foreign_column }
        })),
        rowCount: parseInt(countResult.rows[0].count),
        sampleData: sampleResult.rows
      };
    }
  }

  if (type === 'mysql') {
    const [tables] = await connection.query('SHOW TABLES');
    const tableKey = Object.keys(tables[0])[0];

    for (const row of tables) {
      const tableName = row[tableKey];

      const [columns] = await connection.query(`DESCRIBE ${tableName}`);
      const [foreignKeys] = await connection.query(`
        SELECT COLUMN_NAME, REFERENCED_TABLE_NAME, REFERENCED_COLUMN_NAME
        FROM INFORMATION_SCHEMA.KEY_COLUMN_USAGE
        WHERE TABLE_NAME = ? AND REFERENCED_TABLE_NAME IS NOT NULL
      `, [tableName]);

      const [[countRow]] = await connection.query(`SELECT COUNT(*) as count FROM ${tableName}`);
      const [sampleData] = await connection.query(`SELECT * FROM ${tableName} LIMIT 5`);

      schema.tables[tableName] = {
        columns: columns.map(col => ({
          name: col.Field,
          type: col.Type,
          nullable: col.Null === 'YES',
          primaryKey: col.Key === 'PRI'
        })),
        foreignKeys: foreignKeys.map(fk => ({
          column: fk.COLUMN_NAME,
          references: { table: fk.REFERENCED_TABLE_NAME, column: fk.REFERENCED_COLUMN_NAME }
        })),
        rowCount: countRow.count,
        sampleData
      };
    }
  }

  return schema;
}

// Query validation
function validateQuery(question, query, schema) {
  const validation = { confidence: 100, issues: [], suggestions: [] };
  const questionLower = question.toLowerCase();
  const queryUpper = query.toUpperCase();

  // Check for count queries
  if ((questionLower.includes('how many') || questionLower.includes('count')) && !queryUpper.includes('COUNT')) {
    validation.confidence -= 30;
    validation.issues.push('Question asks for count but query does not use COUNT()');
    validation.suggestions.push('Consider using COUNT() function');
  }

  // Check for aggregation queries
  const aggKeywords = ['total', 'sum', 'average', 'avg', 'minimum', 'min', 'maximum', 'max'];
  const hasAggKeyword = aggKeywords.some(k => questionLower.includes(k));
  const hasAggFunction = ['SUM(', 'AVG(', 'MIN(', 'MAX('].some(f => queryUpper.includes(f));

  if (hasAggKeyword && !hasAggFunction && !queryUpper.includes('COUNT')) {
    validation.confidence -= 20;
    validation.issues.push('Question implies aggregation but query lacks aggregate functions');
  }

  // Check for grouping
  if (questionLower.includes('by') && questionLower.includes('each') && !queryUpper.includes('GROUP BY')) {
    validation.confidence -= 15;
    validation.issues.push('Question implies grouping but query lacks GROUP BY');
    validation.suggestions.push('Consider adding GROUP BY clause');
  }

  // Check for top N queries
  const topMatch = questionLower.match(/top\s+(\d+)/);
  if (topMatch && !queryUpper.includes('LIMIT')) {
    validation.confidence -= 20;
    validation.issues.push(`Question asks for top ${topMatch[1]} but query has no LIMIT`);
    validation.suggestions.push(`Add LIMIT ${topMatch[1]} to query`);
  }

  // Check for date/time filtering
  const dateKeywords = ['today', 'yesterday', 'last week', 'last month', 'this year', 'recent'];
  const hasDateKeyword = dateKeywords.some(k => questionLower.includes(k));
  if (hasDateKeyword && !queryUpper.includes('WHERE')) {
    validation.confidence -= 25;
    validation.issues.push('Question mentions time period but query has no WHERE clause for filtering');
  }

  return validation;
}

// Pattern-based query generation (fallback)
function generatePatternQuery(question, schema) {
  const questionLower = question.toLowerCase();
  const tables = Object.keys(schema.tables);

  // Find relevant table
  let targetTable = null;
  for (const table of tables) {
    if (questionLower.includes(table.toLowerCase()) ||
        questionLower.includes(table.replace(/_/g, ' ').toLowerCase())) {
      targetTable = table;
      break;
    }
  }

  if (!targetTable && tables.length > 0) {
    targetTable = tables[0];
  }

  if (!targetTable) return null;

  const tableInfo = schema.tables[targetTable];
  const numericCols = tableInfo.columns.filter(c =>
    ['int', 'integer', 'decimal', 'numeric', 'float', 'double', 'real', 'bigint', 'smallint']
      .some(t => c.type.toLowerCase().includes(t))
  );

  // Count query
  if (questionLower.includes('how many') || questionLower.includes('count')) {
    return `SELECT COUNT(*) as count FROM ${targetTable}`;
  }

  // Sum/total query
  if ((questionLower.includes('total') || questionLower.includes('sum')) && numericCols.length > 0) {
    return `SELECT SUM(${numericCols[0].name}) as total FROM ${targetTable}`;
  }

  // Average query
  if (questionLower.includes('average') || questionLower.includes('avg')) {
    if (numericCols.length > 0) {
      return `SELECT AVG(${numericCols[0].name}) as average FROM ${targetTable}`;
    }
  }

  // Default: select all with limit
  return `SELECT * FROM ${targetTable} LIMIT 10`;
}

// AI query generation
async function generateAIQuery(question, schema, documentation) {
  if (!openai) return null;

  const schemaDescription = Object.entries(schema.tables).map(([name, info]) => {
    const cols = info.columns.map(c => `${c.name} (${c.type}${c.primaryKey ? ', PK' : ''})`).join(', ');
    const doc = documentation[name]?.description || '';
    return `Table: ${name}${doc ? ` - ${doc}` : ''}\nColumns: ${cols}`;
  }).join('\n\n');

  const prompt = `You are a SQL expert. Generate a SQL query for the following question.

Database Schema:
${schemaDescription}

Question: ${question}

Return ONLY the SQL query, no explanation.`;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-3.5-turbo',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.1
    });

    let query = response.choices[0].message.content.trim();
    // Clean up markdown artifacts
    query = query.replace(/```sql\n?/gi, '').replace(/```\n?/g, '').trim();
    return query;
  } catch (error) {
    console.error('OpenAI error:', error);
    return null;
  }
}

// API Routes

// Connection status
app.get('/api/status', (req, res) => {
  res.json({
    connected: dbState.connected,
    dbType: dbState.dbType,
    schemaLoaded: !!dbState.schema,
    hasDocumentation: Object.keys(dbState.documentation).length > 0
  });
});

// Connect to database
app.post('/api/connect', requireAuth, async (req, res) => {
  try {
    const { connectionString } = req.body;

    if (!connectionString) {
      return res.status(400).json({ error: 'Connection string is required' });
    }

    // Close existing connection
    if (dbState.connection) {
      if (dbState.dbType === 'sqlite') {
        dbState.connection.close();
      } else if (dbState.dbType === 'postgresql') {
        await dbState.connection.end();
      } else if (dbState.dbType === 'mysql') {
        await dbState.connection.end();
      }
    }

    const { type, connection } = await connectToDatabase(connectionString);

    dbState.connected = true;
    dbState.connectionString = connectionString;
    dbState.dbType = type;
    dbState.connection = connection;
    dbState.schema = null;

    res.json({ success: true, dbType: type });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Explore schema
app.get('/api/explore', requireAuth, async (req, res) => {
  try {
    if (!dbState.connected) {
      return res.status(400).json({ error: 'Not connected to database' });
    }

    const schema = await getSchema();
    dbState.schema = schema;

    res.json(schema);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Execute query
app.post('/api/query', requireAuth, async (req, res) => {
  try {
    if (!dbState.connected) {
      return res.status(400).json({ error: 'Not connected to database' });
    }

    const { query } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    // Safety check - only allow SELECT
    const queryUpper = query.trim().toUpperCase();
    if (!queryUpper.startsWith('SELECT')) {
      return res.status(400).json({ error: 'Only SELECT queries are allowed' });
    }

    const rows = await executeQuery(query);
    const columns = rows.length > 0 ? Object.keys(rows[0]) : [];

    res.json({ columns, data: rows });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Generate query from natural language
app.post('/api/generate-query', requireAuth, async (req, res) => {
  try {
    if (!dbState.connected) {
      return res.status(400).json({ error: 'Not connected to database' });
    }

    const { question } = req.body;

    if (!question) {
      return res.status(400).json({ error: 'Question is required' });
    }

    // Auto-load schema if not loaded
    if (!dbState.schema) {
      dbState.schema = await getSchema();
    }

    let query = null;
    let method = 'pattern';

    // Try AI generation first
    if (openai) {
      query = await generateAIQuery(question, dbState.schema, dbState.documentation);
      if (query) method = 'ai';
    }

    // Fall back to pattern matching
    if (!query) {
      query = generatePatternQuery(question, dbState.schema);
    }

    if (!query) {
      return res.status(400).json({ error: 'Could not generate query from question' });
    }

    const validation = validateQuery(question, query, dbState.schema);

    res.json({ query, method, validation });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get documentation
app.get('/api/documentation', requireAuth, (req, res) => {
  res.json(dbState.documentation);
});

// Save documentation
app.post('/api/documentation', requireAuth, (req, res) => {
  const { documentation } = req.body;
  dbState.documentation = documentation || {};
  res.json({ success: true });
});

// Waitlist signup - store emails in SQLite database
const waitlistDb = new Database('waitlist.db');
waitlistDb.exec(`
  CREATE TABLE IF NOT EXISTS waitlist (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

app.post('/api/waitlist', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please enter a valid email address' });
    }

    // Check if email already exists in Firestore
    const existingDoc = await waitlistCollection.doc(email).get();
    if (existingDoc.exists) {
      return res.json({ success: true, message: 'You\'re already on the list!' });
    }

    // Add email to Firestore waitlist
    await waitlistCollection.doc(email).set({
      email: email,
      createdAt: new Date().toISOString(),
      source: 'website'
    });

    console.log(`New waitlist signup: ${email}`);
    res.json({ success: true, message: 'Successfully added to waitlist!' });
  } catch (error) {
    console.error('Waitlist error:', error);
    res.status(500).json({ error: 'Failed to add to waitlist. Please try again.' });
  }
});

// Get all waitlist entries (for admin)
app.get('/api/waitlist', async (req, res) => {
  try {
    const snapshot = await waitlistCollection.orderBy('createdAt', 'desc').get();
    const entries = [];
    snapshot.forEach(doc => {
      entries.push({ id: doc.id, ...doc.data() });
    });
    res.json({ success: true, count: entries.length, entries });
  } catch (error) {
    console.error('Waitlist fetch error:', error);
    res.status(500).json({ error: 'Failed to fetch waitlist' });
  }
});

// Review Analyzer endpoint
app.post('/api/analyze-reviews', async (req, res) => {
  try {
    const { reviews } = req.body;

    if (!reviews || !Array.isArray(reviews) || reviews.length === 0) {
      return res.status(400).json({ error: 'Reviews array is required' });
    }

    // Use OpenAI to analyze reviews if available
    if (openai) {
      const prompt = `You are a product analyst. Analyze customer reviews and identify SPECIFIC FEATURES or ATTRIBUTES being discussed.

YOUR #1 RULE: Keywords must be PRODUCT FEATURES or SERVICE ATTRIBUTES - things you can point to in the product.

ALLOWED KEYWORDS (use these or similar):
- "signup process", "login flow", "onboarding", "account creation"
- "pricing", "subscription plans", "billing", "payment options", "refunds"
- "customer support", "support team", "response time", "help center"
- "mobile app", "desktop version", "browser extension"
- "search functionality", "filters", "navigation", "menu", "dashboard"
- "checkout process", "cart", "shipping", "delivery", "tracking"
- "notifications", "alerts", "email updates"
- "performance", "loading speed", "reliability", "uptime"
- "user interface", "design", "layout"
- "documentation", "tutorials", "guides"

FORBIDDEN KEYWORDS (NEVER use these as keywords):
- Emotions: "love", "hate", "like", "dislike"
- Quality words: "good", "bad", "great", "terrible", "excellent", "poor", "amazing", "awful"
- Generic: "experience", "service", "product", "app", "helpful", "easy", "nice"

Return JSON:
{
  "pros": [{"keyword": "feature name", "summary": "2-3 sentence description of what users said about this feature", "count": number, "sentences": ["review1", "review2"]}],
  "cons": [{"keyword": "feature name", "summary": "2-3 sentence description of what users said about this feature", "count": number, "sentences": ["review1", "review2"]}]
}

Example good output:
- keyword: "customer support" NOT "helpful"
- keyword: "checkout process" NOT "easy"
- keyword: "mobile app" NOT "great"
- keyword: "pricing" NOT "expensive"
- keyword: "signup flow" NOT "simple"

Summary example: "The customer support team was praised for quick response times, typically under 2 hours. Users especially appreciated the knowledgeable agents who resolved issues on first contact."

Reviews to analyze:
${reviews.slice(0, 100).map((r, i) => `${i + 1}. ${r}`).join('\n')}`;

      try {
        const response = await openai.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.3,
          response_format: { type: 'json_object' }
        });

        const result = JSON.parse(response.choices[0].message.content);
        return res.json(result);
      } catch (aiError) {
        console.error('OpenAI error:', aiError);
        // Fall back to basic analysis
      }
    }

    // Basic keyword extraction fallback (without AI)
    console.log('Using fallback analysis (no AI available or AI failed)');

    // Attribute-based templates for fallback analysis
    const attributePatterns = {
      // Positive patterns - map search terms to attribute keywords
      'customer support': {
        searchTerms: ['support', 'help desk', 'customer service', 'support team', 'agent'],
        summary: 'The customer support team received praise for being responsive and helpful. Users noted quick resolution times and knowledgeable staff who understood their issues.'
      },
      'signup process': {
        searchTerms: ['sign up', 'signup', 'register', 'registration', 'create account', 'onboard'],
        summary: 'The signup process was described as smooth and straightforward. Users appreciated the minimal steps required to get started with the product.'
      },
      'user interface': {
        searchTerms: ['interface', 'ui', 'design', 'layout', 'look', 'clean', 'intuitive'],
        summary: 'The user interface received positive feedback for its clean design and intuitive layout. Users found it easy to navigate and locate features.'
      },
      'pricing': {
        searchTerms: ['price', 'pricing', 'cost', 'value', 'affordable', 'cheap', 'worth'],
        summary: 'The pricing structure was seen as fair and competitive. Users felt they received good value for the features and quality provided.'
      },
      'mobile app': {
        searchTerms: ['mobile', 'app', 'phone', 'android', 'ios', 'iphone'],
        summary: 'The mobile app was praised for its functionality and ease of use. Users appreciated having full features available on their phones.'
      },
      'performance': {
        searchTerms: ['fast', 'speed', 'quick', 'performance', 'load', 'responsive'],
        summary: 'The performance was consistently praised with users noting fast load times and responsive interactions. The system handled tasks efficiently.'
      },
      'checkout process': {
        searchTerms: ['checkout', 'payment', 'purchase', 'buy', 'cart', 'order'],
        summary: 'The checkout process was smooth and hassle-free according to users. Payment options were flexible and the flow was straightforward.'
      },
      'shipping': {
        searchTerms: ['shipping', 'delivery', 'arrived', 'package', 'fast delivery'],
        summary: 'The shipping and delivery experience exceeded expectations. Products arrived on time and in good condition.'
      },
      'search functionality': {
        searchTerms: ['search', 'find', 'filter', 'sort', 'browse'],
        summary: 'The search functionality helped users quickly find what they needed. Filters and sorting options made browsing efficient.'
      },
      'documentation': {
        searchTerms: ['documentation', 'docs', 'guide', 'tutorial', 'instructions', 'manual'],
        summary: 'The documentation was comprehensive and easy to follow. Users found helpful guides that answered their questions.'
      }
    };

    const negativeAttributePatterns = {
      'customer support': {
        searchTerms: ['support', 'help', 'customer service', 'no response', 'waiting'],
        summary: 'The customer support experience was frustrating for many users. Long wait times and unhelpful responses were commonly cited issues.'
      },
      'pricing': {
        searchTerms: ['expensive', 'overpriced', 'cost', 'price', 'fee', 'charge'],
        summary: 'The pricing was considered too high by many users relative to competitors. Hidden fees and unexpected charges added to the frustration.'
      },
      'performance': {
        searchTerms: ['slow', 'lag', 'crash', 'freeze', 'loading', 'hang'],
        summary: 'Performance issues plagued the user experience with slow load times and crashes. Users reported lost work and productivity due to instability.'
      },
      'mobile app': {
        searchTerms: ['mobile', 'app', 'phone', 'crash', 'bug'],
        summary: 'The mobile app had significant issues including crashes and missing features. Users found it less reliable than the desktop version.'
      },
      'checkout process': {
        searchTerms: ['checkout', 'payment', 'cart', 'error', 'fail'],
        summary: 'The checkout process caused frustration with errors and lost cart items. Users had to retry multiple times to complete purchases.'
      },
      'user interface': {
        searchTerms: ['confusing', 'interface', 'ui', 'navigate', 'find', 'unclear'],
        summary: 'The user interface was described as confusing and hard to navigate. Users struggled to find features and complete basic tasks.'
      },
      'shipping': {
        searchTerms: ['shipping', 'delivery', 'late', 'delayed', 'lost', 'damaged'],
        summary: 'Shipping and delivery problems were a major pain point. Late arrivals, damaged packages, and lost orders were frequently mentioned.'
      },
      'signup process': {
        searchTerms: ['signup', 'register', 'account', 'verify', 'confirmation'],
        summary: 'The signup process was cumbersome with too many steps required. Users encountered errors and verification issues that delayed access.'
      },
      'notifications': {
        searchTerms: ['notification', 'email', 'spam', 'alert', 'too many'],
        summary: 'The notification system was overwhelming with too many emails and alerts. Users felt spammed and had trouble managing preferences.'
      },
      'billing': {
        searchTerms: ['billing', 'charge', 'invoice', 'cancel', 'refund', 'subscription'],
        summary: 'Billing issues caused significant problems including unexpected charges and difficulty canceling. Refund processes were described as painful.'
      }
    };

    const prosMap = {};
    const consMap = {};

    // Positive sentiment indicators
    const positiveIndicators = ['great', 'love', 'excellent', 'amazing', 'good', 'best', 'helpful', 'easy', 'fast', 'beautiful', 'perfect', 'awesome', 'fantastic', 'wonderful', 'nice', 'friendly', 'quick', 'simple', 'intuitive', 'reliable', 'recommend'];
    // Negative sentiment indicators
    const negativeIndicators = ['bad', 'terrible', 'awful', 'slow', 'crash', 'bug', 'broken', 'hate', 'worst', 'poor', 'difficult', 'confusing', 'expensive', 'annoying', 'frustrating', 'useless', 'disappointing', 'horrible', 'laggy', 'glitch', 'error', 'fail', 'problem', 'issue'];

    reviews.forEach(review => {
      const lowerReview = review.toLowerCase();
      const isPositive = positiveIndicators.some(word => lowerReview.includes(word));
      const isNegative = negativeIndicators.some(word => lowerReview.includes(word));

      // Check for attribute matches in positive context
      if (isPositive) {
        Object.entries(attributePatterns).forEach(([attribute, config]) => {
          if (config.searchTerms.some(term => lowerReview.includes(term))) {
            if (!prosMap[attribute]) prosMap[attribute] = { count: 0, sentences: [], summary: config.summary };
            prosMap[attribute].count++;
            if (prosMap[attribute].sentences.length < 5) prosMap[attribute].sentences.push(review);
          }
        });
      }

      // Check for attribute matches in negative context
      if (isNegative) {
        Object.entries(negativeAttributePatterns).forEach(([attribute, config]) => {
          if (config.searchTerms.some(term => lowerReview.includes(term))) {
            if (!consMap[attribute]) consMap[attribute] = { count: 0, sentences: [], summary: config.summary };
            consMap[attribute].count++;
            if (consMap[attribute].sentences.length < 5) consMap[attribute].sentences.push(review);
          }
        });
      }
    });

    const pros = Object.entries(prosMap)
      .map(([keyword, data]) => ({ keyword, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const cons = Object.entries(consMap)
      .map(([keyword, data]) => ({ keyword, ...data }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({ pros, cons });

  } catch (error) {
    console.error('Review analysis error:', error);
    res.status(500).json({ error: 'Failed to analyze reviews' });
  }
});

// Serve review-analyzer page
app.get('/review-analyzer', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'review-analyzer.html'));
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Serve frontend for root path
app.get('/', (req, res) => {
  res.sendFile(path.join(FRONTEND_PATH, 'index.html'));
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Mode: ${DEV_MODE ? '🔧 DEVELOPMENT (auth bypassed)' : '🔒 PRODUCTION'}`);
  console.log(`Google OAuth: ${process.env.GOOGLE_CLIENT_ID ? 'Configured' : 'Not configured'}`);
  console.log(`OpenAI: ${process.env.OPENAI_API_KEY ? 'Configured' : 'Not configured'}`);
  if (DEV_MODE) {
    console.log(`\n⚠️  Running in DEV MODE - authentication is bypassed!`);
    console.log(`   To enable Google OAuth, set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env`);
  }
});
