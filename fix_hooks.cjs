const fs = require('fs');
const path = 'c:\\laragon\\www\\MDRRMO_Management_system\\resources\\js\\components\\Staff2App.jsx';
let content = fs.readFileSync(path, 'utf8');

const loginBlockStart = '  if (!token) {';
const startIndex = content.indexOf(loginBlockStart);
const endIndex = content.indexOf('  useEffect(() => {\n    const socket');

if (startIndex !== -1 && endIndex !== -1) {
    const loginBlock = content.substring(startIndex, endIndex);
    content = content.slice(0, startIndex) + content.slice(endIndex);
    
    const returnStart = '  return (\n    <div className="staff2-dashboard">';
    const returnIndex = content.indexOf(returnStart);
    
    if (returnIndex !== -1) {
        content = content.slice(0, returnIndex) + loginBlock + returnStart + content.slice(returnIndex + returnStart.length);
        fs.writeFileSync(path, content);
        console.log('Successfully moved login block.');
    } else {
        console.log('Failed to find return start.');
    }
} else {
    console.log('Failed to find login block.');
}
