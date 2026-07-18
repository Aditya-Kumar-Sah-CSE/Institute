const fs = require('fs');
const path = require('path');

const migrationsDir = 'd:\\Institute\\institute1\\supabase\\migrations';

function parseMigrations() {
    const files = fs.readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
    
    const db = {
        tables: new Set(),
        indexes: new Map(), // name -> Set of files
        policies: new Map(), // name -> Set of files
        triggers: new Map(),
        functions: new Map(),
        enums: new Set(),
        buckets: new Set()
    };

    const duplicateAlerts = [];

    const regexMap = {
        table: /(?:CREATE TABLE|CREATE TABLE IF NOT EXISTS)\s+(?:public\.)?([a-zA-Z0-9_]+)/g,
        index: /(?:CREATE INDEX|CREATE UNIQUE INDEX)(?: IF NOT EXISTS)?\s+([a-zA-Z0-9_]+)/g,
        policy: /CREATE POLICY\s+"([^"]+)"/g,
        trigger: /CREATE TRIGGER\s+([a-zA-Z0-9_]+)/g,
        function: /CREATE (?:OR REPLACE )?FUNCTION\s+(?:public\.)?([a-zA-Z0-9_]+)/g,
        enum: /CREATE TYPE\s+(?:public\.)?([a-zA-Z0-9_]+)\s+AS ENUM/g,
        bucket: /INSERT INTO storage\.buckets\s*\([^)]*\)\s*VALUES\s*\(\s*'([^']+)'/g
    };

    for (const file of files) {
        const content = fs.readFileSync(path.join(migrationsDir, file), 'utf-8');
        
        // Match Tables
        let match;
        while ((match = regexMap.table.exec(content)) !== null) {
            db.tables.add(match[1]);
        }
        
        // Match Indexes
        while ((match = regexMap.index.exec(content)) !== null) {
            const name = match[1];
            if (!db.indexes.has(name)) db.indexes.set(name, new Set());
            else duplicateAlerts.push(`DUPLICATE INDEX: ${name} in ${file} (also in ${Array.from(db.indexes.get(name)).join(', ')})`);
            db.indexes.get(name).add(file);
        }

        // Match Policies
        while ((match = regexMap.policy.exec(content)) !== null) {
            const name = match[1];
            if (!db.policies.has(name)) db.policies.set(name, new Set());
            else duplicateAlerts.push(`DUPLICATE POLICY: "${name}" in ${file} (also in ${Array.from(db.policies.get(name)).join(', ')})`);
            db.policies.get(name).add(file);
        }

        // Match Triggers
        while ((match = regexMap.trigger.exec(content)) !== null) {
            const name = match[1];
            if (!db.triggers.has(name)) db.triggers.set(name, new Set());
            else duplicateAlerts.push(`DUPLICATE TRIGGER: ${name} in ${file} (also in ${Array.from(db.triggers.get(name)).join(', ')})`);
            db.triggers.get(name).add(file);
        }

        // Match Functions
        while ((match = regexMap.function.exec(content)) !== null) {
            const name = match[1];
            if (!db.functions.has(name)) db.functions.set(name, new Set());
            else duplicateAlerts.push(`REDEFINED FUNCTION: ${name} in ${file} (also in ${Array.from(db.functions.get(name)).join(', ')})`);
            db.functions.get(name).add(file);
        }
        
        // Match Storage Buckets
        while ((match = regexMap.bucket.exec(content)) !== null) {
            db.buckets.add(match[1]);
        }
    }

    const report = {
        totalMigrations: files.length,
        tablesCount: db.tables.size,
        tables: Array.from(db.tables),
        duplicateAlerts,
        uniqueIndexes: db.indexes.size,
        uniquePolicies: db.policies.size,
        uniqueFunctions: db.functions.size,
        uniqueTriggers: db.triggers.size,
        buckets: Array.from(db.buckets)
    };

    fs.writeFileSync('d:\\Institute\\institute1\\db_audit.json', JSON.stringify(report, null, 2));
    console.log("Audit complete! Saved to d:\\Institute\\institute1\\db_audit.json");
    if (duplicateAlerts.length > 0) {
        console.log(`Found ${duplicateAlerts.length} redundancy warnings.`);
    }
}

parseMigrations();
