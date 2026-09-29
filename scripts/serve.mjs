import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
const port=Number(process.env.PORT||4173);const host='127.0.0.1';
const output=fs.existsSync('dist/index.html')?'dist/index.html':'preview.html';
if(!fs.existsSync(output)){console.error('Run npm run build first.');process.exit(1);}
http.createServer((req,res)=>{let pathname;try{pathname=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400);res.end('Bad request');return;}
 if(pathname!=='/'&&pathname!=='/index.html'){res.writeHead(404);res.end('Not found');return;}
 res.writeHead(200,{'Content-Type':'text/html; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});fs.createReadStream(path.resolve(output)).pipe(res);
}).listen(port,host,()=>console.log(`Preview: http://${host}:${port} · ${output}`));
