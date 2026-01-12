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

app.post('/api/waitlist', (req, res) => {
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

    // Insert email into waitlist
    const stmt = waitlistDb.prepare('INSERT INTO waitlist (email) VALUES (?)');
    stmt.run(email);

    console.log(`New waitlist signup: ${email}`);
    res.json({ success: true, message: 'Successfully added to waitlist!' });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.json({ success: true, message: 'You\'re already on the list!' });
    }
    console.error('Waitlist error:', error);
    res.status(500).json({ error: 'Failed to add to waitlist. Please try again.' });
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
      const prompt = `Analyze the following customer reviews and extract key themes.

For each theme, categorize it as either a PRO (positive feedback) or CON (negative feedback).
Return a JSON object with this exact structure:
{
  "pros": [
    {"keyword": "keyword1", "summary": "Human-readable sentence with the keyword embedded naturally", "count": number, "sentences": ["actual review 1", "actual review 2"]},
    ...
  ],
  "cons": [
    {"keyword": "keyword1", "summary": "Human-readable sentence with the keyword embedded naturally", "count": number, "sentences": ["actual review 1", "actual review 2"]},
    ...
  ]
}

CRITICAL RULES FOR KEYWORDS:
- Keywords must be SPECIFIC PRODUCT/SERVICE ATTRIBUTES, not sentiment words
- GOOD keywords (specific attributes): "signup flow", "pricing", "customer support", "checkout process", "search feature", "notifications", "loading speed", "onboarding", "payment options", "navigation", "mobile app", "dashboard", "shipping", "returns policy", "account settings"
- BAD keywords (sentiment words - DO NOT USE): "good", "bad", "love", "hate", "great", "terrible", "amazing", "awful", "excellent", "poor"
- Keywords should identify WHAT feature or aspect users are talking about, not HOW they feel

CRITICAL RULES FOR SUMMARIES:
- Write detailed, insightful summaries (2-3 sentences) that describe specific user sentiment with rich context
- The keyword (the specific attribute) MUST appear naturally within the summary
- Include specific details about WHY users feel this way and WHAT specific aspects they mention
- GOOD examples (detailed and insightful):
  * "The signup flow was praised for being quick and straightforward, taking less than a minute to complete. Users appreciated not needing to verify email before accessing basic features."
  * "Customers were frustrated with the pricing structure, finding it confusing and expensive compared to competitors. Hidden fees at checkout were a common complaint."
  * "The customer support team received high marks for fast response times and knowledgeable agents. Most issues were resolved within hours rather than days."
  * "The checkout process caused significant frustration due to frequent crashes and lost cart items. Users on mobile devices experienced this more frequently."
- BAD examples (DO NOT write like this):
  * "Users mentioned interface"
  * "People spoke about delivery"
  * "Users love the product"
  * "The app is great"
- The summary should tell a detailed story about what people experienced with that specific feature/attribute

Other rules:
- Extract 5-10 keywords for each category (pros and cons)
- Keywords should be 1-3 words identifying specific features or attributes (e.g., "signup flow", "customer support", "checkout", "pricing", "mobile app", "search", "notifications")
- Count how many reviews mention each theme
- Include the actual review sentences that mention each theme
- Only return valid JSON, no other text

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

    const positiveTemplates = {
      'great': 'Customers consistently described their experience as great, highlighting the overall quality and value. Many expressed genuine satisfaction and said it exceeded their expectations.',
      'love': 'Users love the product and express strong emotional attachment to it. They frequently recommend it to friends and family, citing it as a must-have solution.',
      'excellent': 'The service received excellent ratings across multiple dimensions including quality, reliability, and value. Reviewers often compared it favorably to premium alternatives.',
      'amazing': 'People were amazed by the quality and performance, with many describing unexpected positive surprises. First impressions were overwhelmingly positive.',
      'good': 'The overall experience was rated as good by the majority of customers. While not always exceptional, it consistently met expectations and delivered solid value.',
      'best': 'Many consider this among the best options available in its category. Customers who tried alternatives often returned, citing superior quality and features.',
      'helpful': 'Users found the support team and documentation genuinely helpful in solving their problems. Response times were quick and solutions were effective.',
      'easy': 'The product was praised for being easy to use from day one. Even users who described themselves as non-technical were able to get started quickly.',
      'fast': 'Customers appreciated the fast performance, noting snappy load times and quick responses. Delivery times also exceeded expectations for physical products.',
      'beautiful': 'The design was described as beautiful by users who appreciated attention to aesthetic details. The visual experience enhanced overall satisfaction significantly.',
      'perfect': 'Many reviewers called the experience perfect for their specific needs. It solved their problems completely without requiring workarounds or compromises.',
      'awesome': 'Users thought the product was awesome, frequently using enthusiastic language in their reviews. The excitement was evident across different user segments.',
      'fantastic': 'The service received fantastic feedback with customers praising multiple aspects simultaneously. The combination of features created a compelling overall package.',
      'wonderful': 'Customers had a wonderful experience that they were eager to share. Positive word-of-mouth was common, with many reviews mentioning referrals.',
      'nice': 'Users found the product nice and pleasant to use on a daily basis. The experience was described as smooth and enjoyable without major friction points.',
      'friendly': 'The interface and support team were described as friendly and approachable. Users felt comfortable reaching out for help and navigating the product.',
      'quick': 'Reviewers praised the quick turnaround on everything from support responses to feature delivery. Efficiency was a standout characteristic.',
      'simple': 'The product was appreciated for its simple, uncluttered design philosophy. Complexity was hidden well, making common tasks straightforward.',
      'intuitive': 'Users found the interface intuitive and were able to accomplish tasks without extensive training. The learning curve was minimal even for advanced features.',
      'reliable': 'Customers valued the reliable performance and consistency over time. Uptime was excellent and the product worked as expected without surprises.'
    };

    const negativeTemplates = {
      'bad': 'Some users had a genuinely bad experience that significantly impacted their satisfaction. Issues ranged from functionality problems to poor customer service interactions.',
      'terrible': 'A subset of customers described their experience as terrible, citing multiple compounding issues. These reviews often mentioned feeling ignored or let down.',
      'awful': 'Some reviewers found the service awful and expressed regret about their purchase decision. The negative experience was often unexpected given marketing promises.',
      'slow': 'Users complained about slow performance that impacted their productivity. Load times, response delays, and processing speeds were common pain points.',
      'crash': 'Multiple users reported frustrating crashes that interrupted their work and caused data loss. The instability appeared across different devices and scenarios.',
      'bug': 'Customers encountered bugs that affected core functionality. Some issues persisted across updates, leading to frustration with the development team.',
      'broken': 'Key features were reported as broken by users who could not complete essential tasks. Workarounds were often required for basic functionality.',
      'hate': 'A number of users expressed strong negative emotions about their experience. The frustration was deep enough to prompt detailed negative reviews.',
      'worst': 'Some considered this among the worst experiences in the category. Comparisons to competitors were unfavorable across multiple dimensions.',
      'poor': 'The quality was rated as poor by customers who expected more given the price point. Value perception was significantly impacted.',
      'difficult': 'Users found critical tasks difficult to accomplish without extensive trial and error. The learning curve was steeper than anticipated.',
      'confusing': 'The interface was described as confusing with unclear navigation and labeling. Users struggled to find features and understand workflows.',
      'expensive': 'Many customers felt the pricing was expensive relative to the value delivered. Cost concerns were amplified when issues arose.',
      'annoying': 'Specific features and behaviors were found annoying by users during regular use. Small frustrations accumulated into significant dissatisfaction.',
      'frustrating': 'Users expressed deep frustration with recurring issues that never seemed to get resolved. The emotional toll was evident in review language.',
      'useless': 'Some features were considered useless and added clutter without providing value. Users questioned why resources were spent on them.',
      'disappointing': 'The experience was disappointing compared to expectations set by marketing and reviews. The gap between promise and reality was significant.',
      'horrible': 'A portion of customers had a horrible experience that they felt compelled to warn others about. The negativity was intense and detailed.',
      'laggy': 'Users reported laggy performance that made the experience feel outdated and unpolished. Responsiveness issues were particularly noticeable.',
      'glitch': 'Customers encountered visual and functional glitches that undermined confidence in the product. The polish expected at this level was missing.'
    };

    const prosMap = {};
    const consMap = {};

    reviews.forEach(review => {
      const lowerReview = review.toLowerCase();

      Object.keys(positiveTemplates).forEach(word => {
        if (lowerReview.includes(word)) {
          if (!prosMap[word]) prosMap[word] = { count: 0, sentences: [], summary: positiveTemplates[word] };
          prosMap[word].count++;
          if (prosMap[word].sentences.length < 5) prosMap[word].sentences.push(review);
        }
      });

      Object.keys(negativeTemplates).forEach(word => {
        if (lowerReview.includes(word)) {
          if (!consMap[word]) consMap[word] = { count: 0, sentences: [], summary: negativeTemplates[word] };
          consMap[word].count++;
          if (consMap[word].sentences.length < 5) consMap[word].sentences.push(review);
        }
      });
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
