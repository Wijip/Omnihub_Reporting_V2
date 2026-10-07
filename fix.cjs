const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf-8');

code = code.replace(/\\`/g, '`');
code = code.replace(/\\\${/g, '${');

fs.writeFileSync('server.ts', code);
console.log('Fixed escaped backticks in server.ts');
