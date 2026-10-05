import { cp, mkdir, readFile, writeFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const publicDir=path.join(root,'public'),dist=path.join(root,'dist');
await mkdir(dist,{recursive:true});await cp(publicDir,dist,{recursive:true});
const files=[];
async function walk(dir){for(const entry of await readdir(dir)){const p=path.join(dir,entry);if((await stat(p)).isDirectory())await walk(p);else {const bytes=await readFile(p);files.push({path:path.relative(dist,p).replaceAll('\\','/'),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')});}}}
await walk(dist);
await writeFile(path.join(root,'build-manifest.json'),JSON.stringify({version:'1.0.0',files},null,2));
console.log(`Сборка 1.0.0: ${files.length} файлов в dist. Контрольные суммы: build-manifest.json.`);
