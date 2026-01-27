const fs = require('fs');
const path = process.argv[2];
const s = fs.readFileSync(path,'utf8');
const openDiv = (s.match(/<div(\s|>)/g) || []).length;
const closeDiv = (s.match(/<\/div>/g) || []).length;
console.log('div open:', openDiv, 'div close:', closeDiv);
const openOther = (s.match(/<([a-zA-Z0-9-]+)(\s|>)/g) || []).length;
console.log('total opening tags (approx):', openOther);
process.exit(openDiv===closeDiv?0:1);
