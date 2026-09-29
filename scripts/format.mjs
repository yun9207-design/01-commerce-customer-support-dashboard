import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
function walk(dir) { return fs.readdirSync(dir, { withFileTypes: true }).flatMap(e => e.isDirectory() ? walk(path.join(dir, e.name)) : [path.join(dir, e.name)]); }
const printer = ts.createPrinter({ newLine: ts.NewLineKind.LineFeed });
for (const file of walk('src').filter(p => /\.tsx?$/.test(p))) {
  const source = ts.createSourceFile(file, fs.readFileSync(file, 'utf8'), ts.ScriptTarget.Latest, true, file.endsWith('.tsx') ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  fs.writeFileSync(file, printer.printFile(source));
}
console.log('Formatted TS/TSX with TypeScript printer. Run checks after formatting.');
