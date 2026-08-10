const fs = require('fs');
const path = require('path');

const serverPath = path.join(__dirname, 'server.js');
const appPath = path.join(__dirname, 'app.js');
const targetFile = fs.existsSync(serverPath) ? serverPath : appPath;

let content = fs.readFileSync(targetFile, 'utf8');

if (!content.includes('/api/cities')) {
  const routeImport = `const citiesRouter = require('./routes/cities');\n`;
  const routeUse = `app.use('/api', citiesRouter);\n`;

  content = routeImport + content;
  
  if (content.includes('app.listen')) {
    content = content.replace('app.listen', `${routeUse}\napp.listen`);
  } else {
    content += `\n${routeUse}`;
  }

  fs.writeFileSync(targetFile, content, 'utf8');
  console.log('✓ City route registered successfully in server.');
} else {
  console.log('ℹ Route already present in server file.');
}
