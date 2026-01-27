const fs = require('fs');
const path = process.argv[2];
const txt = fs.readFileSync(path,'utf8');
const lines = txt.split('\n');
const tagRegex = /<(\/?)([a-zA-Z0-9-]+)(\s|>|\/)/g;
const selfClosing = new Set(['img','input','br','meta','link','hr','area','source','track','wbr','path','rect','circle']);
const stack = [];
for (let i=0;i<lines.length;i++){
  let line = lines[i];
  let m;
  while ((m = tagRegex.exec(line)) !== null){
    const closing = m[1] === '/';
    const tag = m[2];
    const rest = line.slice(m.index + m[0].length - 1);
    const isSelfClose = rest.trim().startsWith('/') || selfClosing.has(tag);
    if (!closing && !isSelfClose){
      stack.push({tag, line: i+1});
    } else if (closing){
      // pop last matching opening tag
      let idx = stack.map(s=>s.tag).lastIndexOf(tag);
      if (idx === -1){
        console.error('Unmatched closing tag </'+tag+'> at line', i+1);
      } else {
        stack.splice(idx,1);
      }
    }
  }
}
if (stack.length){
  console.log('Unclosed tags:');
  stack.forEach(s=>console.log(s.tag,'opened at line',s.line));
  process.exit(1);
}
console.log('All tags matched');
