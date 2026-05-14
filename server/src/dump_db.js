const Database = require('better-sqlite3');
const path = require('path');
const db = new Database(path.join(__dirname, '../data/stockstream.db'));
const flag = db.prepare("SELECT * FROM candles WHERE symbol LIKE '%NT208%'").all();
console.log('Flag in candles:', flag);
const flag2 = db.prepare("SELECT * FROM request_log WHERE endpoint LIKE '%NT208%'").all();
console.log('Flag in request_log:', flag2);
