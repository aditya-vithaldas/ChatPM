from flask import Flask, request, jsonify
from flask_cors import CORS
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.exc import SQLAlchemyError
import os
import json
import re
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)
CORS(app)

# Global state for the current database connection
db_state = {
    "engine": None,
    "connection_string": None,
    "schema": None,
    "documentation": None
}


def get_engine():
    return db_state.get("engine")


@app.route("/api/connect", methods=["POST"])
def connect_database():
    """Connect to a database using the provided connection string."""
    data = request.json
    connection_string = data.get("connection_string")

    if not connection_string:
        return jsonify({"success": False, "error": "Connection string is required"}), 400

    try:
        engine = create_engine(connection_string)
        # Test the connection
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        db_state["engine"] = engine
        db_state["connection_string"] = connection_string
        db_state["schema"] = None
        db_state["documentation"] = None

        return jsonify({
            "success": True,
            "message": "Successfully connected to the database"
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400


@app.route("/api/explore", methods=["GET"])
def explore_schema():
    """Explore the database schema and return table/column information."""
    engine = get_engine()
    if not engine:
        return jsonify({"success": False, "error": "Not connected to a database"}), 400

    try:
        inspector = inspect(engine)
        schema_info = {}

        for table_name in inspector.get_table_names():
            columns = []
            for column in inspector.get_columns(table_name):
                columns.append({
                    "name": column["name"],
                    "type": str(column["type"]),
                    "nullable": column.get("nullable", True),
                    "default": str(column.get("default")) if column.get("default") else None,
                    "primary_key": False  # Will be updated below
                })

            # Get primary keys
            pk_constraint = inspector.get_pk_constraint(table_name)
            pk_columns = pk_constraint.get("constrained_columns", []) if pk_constraint else []
            for col in columns:
                if col["name"] in pk_columns:
                    col["primary_key"] = True

            # Get foreign keys
            foreign_keys = []
            for fk in inspector.get_foreign_keys(table_name):
                foreign_keys.append({
                    "constrained_columns": fk.get("constrained_columns", []),
                    "referred_table": fk.get("referred_table"),
                    "referred_columns": fk.get("referred_columns", [])
                })

            # Get sample data (first 5 rows)
            sample_data = []
            try:
                with engine.connect() as conn:
                    result = conn.execute(text(f'SELECT * FROM "{table_name}" LIMIT 5'))
                    rows = result.fetchall()
                    col_names = result.keys()
                    for row in rows:
                        sample_data.append(dict(zip(col_names, [str(v) if v is not None else None for v in row])))
            except:
                pass

            # Get row count
            row_count = 0
            try:
                with engine.connect() as conn:
                    result = conn.execute(text(f'SELECT COUNT(*) FROM "{table_name}"'))
                    row_count = result.scalar()
            except:
                pass

            schema_info[table_name] = {
                "columns": columns,
                "foreign_keys": foreign_keys,
                "sample_data": sample_data,
                "row_count": row_count
            }

        db_state["schema"] = schema_info

        return jsonify({
            "success": True,
            "schema": schema_info
        })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400


@app.route("/api/documentation", methods=["POST"])
def save_documentation():
    """Save user-provided documentation for tables and columns."""
    data = request.json
    documentation = data.get("documentation", {})

    db_state["documentation"] = documentation

    return jsonify({
        "success": True,
        "message": "Documentation saved successfully"
    })


@app.route("/api/documentation", methods=["GET"])
def get_documentation():
    """Get the current documentation."""
    return jsonify({
        "success": True,
        "documentation": db_state.get("documentation", {})
    })


@app.route("/api/query", methods=["POST"])
def execute_query():
    """Execute a SQL query and return results."""
    engine = get_engine()
    if not engine:
        return jsonify({"success": False, "error": "Not connected to a database"}), 400

    data = request.json
    query = data.get("query", "").strip()

    if not query:
        return jsonify({"success": False, "error": "Query is required"}), 400

    # Basic safety check - only allow SELECT queries
    if not query.upper().startswith("SELECT"):
        return jsonify({
            "success": False,
            "error": "Only SELECT queries are allowed for safety"
        }), 400

    try:
        with engine.connect() as conn:
            result = conn.execute(text(query))
            rows = result.fetchall()
            columns = list(result.keys())

            data_rows = []
            for row in rows:
                data_rows.append([str(v) if v is not None else None for v in row])

            return jsonify({
                "success": True,
                "columns": columns,
                "data": data_rows,
                "row_count": len(data_rows)
            })
    except Exception as e:
        return jsonify({
            "success": False,
            "error": str(e)
        }), 400


@app.route("/api/generate-query", methods=["POST"])
def generate_query():
    """Generate a SQL query from natural language using the schema context."""
    engine = get_engine()
    if not engine:
        return jsonify({"success": False, "error": "Not connected to a database"}), 400

    data = request.json
    question = data.get("question", "").strip()

    if not question:
        return jsonify({"success": False, "error": "Question is required"}), 400

    schema = db_state.get("schema", {})
    documentation = db_state.get("documentation", {})

    # Build context for query generation
    context = build_schema_context(schema, documentation)

    # Try to use OpenAI if available, otherwise use simple pattern matching
    openai_key = os.getenv("OPENAI_API_KEY")

    if openai_key:
        try:
            from openai import OpenAI
            client = OpenAI(api_key=openai_key)

            prompt = f"""You are a SQL query generator. Given the following database schema and a natural language question, generate a valid SQL SELECT query.

DATABASE SCHEMA:
{context}

USER QUESTION: {question}

IMPORTANT RULES:
1. Only generate SELECT queries
2. Use proper SQL syntax
3. Return ONLY the SQL query, no explanations
4. If the question cannot be answered with the schema, return a query that gets the closest relevant data

SQL QUERY:"""

            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[{"role": "user", "content": prompt}],
                temperature=0.1,
                max_tokens=500
            )

            generated_query = response.choices[0].message.content.strip()
            # Clean up the query
            generated_query = generated_query.replace("```sql", "").replace("```", "").strip()

            return jsonify({
                "success": True,
                "query": generated_query,
                "method": "ai"
            })
        except Exception as e:
            # Fall back to simple generation
            pass

    # Simple pattern-based query generation (fallback)
    generated_query = simple_query_generator(question, schema)

    return jsonify({
        "success": True,
        "query": generated_query,
        "method": "pattern"
    })


def build_schema_context(schema, documentation):
    """Build a text representation of the schema for AI context."""
    lines = []
    for table_name, table_info in schema.items():
        table_doc = documentation.get(table_name, {})
        table_desc = table_doc.get("description", "")

        lines.append(f"TABLE: {table_name}")
        if table_desc:
            lines.append(f"  Description: {table_desc}")
        lines.append("  COLUMNS:")

        for col in table_info.get("columns", []):
            col_name = col["name"]
            col_type = col["type"]
            col_doc = table_doc.get("columns", {}).get(col_name, "")
            pk = " (PRIMARY KEY)" if col.get("primary_key") else ""

            line = f"    - {col_name}: {col_type}{pk}"
            if col_doc:
                line += f" -- {col_doc}"
            lines.append(line)

        if table_info.get("foreign_keys"):
            lines.append("  FOREIGN KEYS:")
            for fk in table_info["foreign_keys"]:
                lines.append(f"    - {fk['constrained_columns']} -> {fk['referred_table']}({fk['referred_columns']})")

        lines.append("")

    return "\n".join(lines)


def simple_query_generator(question, schema):
    """Simple pattern-based query generator as fallback."""
    question_lower = question.lower()
    tables = list(schema.keys())

    # Find mentioned table
    target_table = None
    for table in tables:
        if table.lower() in question_lower:
            target_table = table
            break

    if not target_table and tables:
        target_table = tables[0]

    # Detect query type
    if any(word in question_lower for word in ["count", "how many", "total"]):
        return f'SELECT COUNT(*) FROM "{target_table}"'
    elif any(word in question_lower for word in ["all", "show", "list", "get"]):
        return f'SELECT * FROM "{target_table}" LIMIT 100'
    elif "average" in question_lower or "avg" in question_lower:
        # Try to find a numeric column
        columns = schema.get(target_table, {}).get("columns", [])
        numeric_cols = [c["name"] for c in columns if any(t in c["type"].upper() for t in ["INT", "FLOAT", "DECIMAL", "NUMERIC"])]
        if numeric_cols:
            return f'SELECT AVG("{numeric_cols[0]}") FROM "{target_table}"'

    return f'SELECT * FROM "{target_table}" LIMIT 10'


@app.route("/api/status", methods=["GET"])
def get_status():
    """Get the current connection status."""
    return jsonify({
        "connected": db_state.get("engine") is not None,
        "has_schema": db_state.get("schema") is not None,
        "has_documentation": db_state.get("documentation") is not None
    })


if __name__ == "__main__":
    app.run(debug=True, port=5000)
