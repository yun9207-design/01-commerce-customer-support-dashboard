/** Reproducible offline-capable production bundle. No CDN, network requests, eval, or API keys. */
import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
const root=process.cwd();
const pkg=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8'));
if(pkg.dependencies.react!=='19.1.1'||pkg.dependencies['react-dom']!=='19.1.1')throw Error('Portable vendor runtime is React 19.1.1. Update vendor + provenance + tests together, or use build:vite.');
function walk(dir){return fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(dir,e.name)):[path.join(dir,e.name)]);}
const sources=walk(path.join(root,'src')).filter(f=>/\.(ts|tsx)$/.test(f)&&!f.endsWith('.d.ts'));
const modules=[];
for(const file of sources){const id=path.relative(root,file).replaceAll('\\','/').replace(/\.(ts|tsx)$/,'');const result=ts.transpileModule(fs.readFileSync(file,'utf8'),{fileName:file,reportDiagnostics:true,compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,jsx:ts.JsxEmit.React,esModuleInterop:true,strict:true}});const errors=(result.diagnostics??[]).filter(d=>d.category===ts.DiagnosticCategory.Error);if(errors.length){console.error(ts.formatDiagnosticsWithColorAndContext(errors,{getCurrentDirectory:()=>root,getCanonicalFileName:f=>f,getNewLine:()=> '\n'}));process.exit(1);}modules.push(`${JSON.stringify(id)}:function(require,module,exports){\n${result.outputText}\n}`);}
const runtime=fs.readFileSync(path.join(root,'vendor/react-runtime.js'),'utf8');
const loader=`(function(){const modules={${modules.join(',\n')}};const cache={};function load(id){if(cache[id])return cache[id].exports;if(!modules[id])throw Error('Module not found: '+id);const module={exports:{}};cache[id]=module;function require(name){if(name==='react')return globalThis.__CS_REACT__;if(name==='react-dom/client')return globalThis.__CS_REACT_DOM__;if(name.endsWith('.css'))return{};if(!name.startsWith('.'))throw Error('Unsupported dependency: '+name);const parts=(id.slice(0,id.lastIndexOf('/')+1)+name).split('/'),normal=[];for(const p of parts){if(p==='..')normal.pop();else if(p!=='.'&&p!=='')normal.push(p);}return load(normal.join('/').replace(/\\.(tsx?|jsx?)$/,''));}modules[id](require,module,module.exports);return module.exports;}load('src/main');})();`;
const css=fs.readFileSync(path.join(root,'src/styles.css'),'utf8');
const html=`<!doctype html>\n<html lang="ko"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><meta name="color-scheme" content="light"><meta name="description" content="주문·문의·승인·백업이 연결되는 쇼핑몰 고객지원 실습 대시보드"><title>Commerce CS Lab · 고객지원 실습</title><style>${css.replaceAll('</style','<\\/style')}</style></head><body><div id="root"></div><noscript>이 앱은 JavaScript를 켜야 사용할 수 있습니다.</noscript><script>\n${(runtime+'\n'+loader).replaceAll('</script','<\\/script')}\n</script></body></html>`;
fs.mkdirSync(path.join(root,'dist'),{recursive:true});fs.writeFileSync(path.join(root,'dist/index.html'),html);fs.writeFileSync(path.join(root,'preview.html'),html);
console.log(`Built ${sources.length} source modules → dist/index.html & preview.html (${Math.round(Buffer.byteLength(html)/1024)} KiB)`);
console.log('Production bundle uses pinned MIT React 19.1.1. Run npm run typecheck for semantic TS checks.');
