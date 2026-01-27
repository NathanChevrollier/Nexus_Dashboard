const fs = require('fs');
const path = process.argv[2];
const txt = fs.readFileSync(path, 'utf8');
const stack = [];
const open = {'(':')','[':']','{':'}'};
const close = {')':'(',']':'[','}':'{'};
for (let i=0;i<txt.length;i++){
  const ch = txt[i];
  if (open[ch]) stack.push({ch, i});
  else if (close[ch]){
    if (stack.length===0){
      console.error('Unmatched closing', ch, 'at', i);
      process.exit(2);
    }
    const top = stack.pop();
    if (open[top.ch] !== ch){
      console.error('Mismatched', top.ch, 'at', top.i, 'closed by', ch, 'at', i);
      process.exit(3);
    }
  }
}
if (stack.length) {
  console.error('Unclosed opens at end:', stack.map(s=>s.ch+'@'+s.i).join(', '));
  process.exit(4);
}
console.log('All brackets matched');
