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

// Middleware
app.use(express.json());
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
    callbackURL: process.env.GOOGLE_CALLBACK_URL || '/auth/google/callback'
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
