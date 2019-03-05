import fs from 'fs';
import path from 'path';
import { is, slug, Encoding } from '@toba/tools/cjs';
import { svgToJSX } from '@toba/svg-transformer';
import { icons } from './index';

/** Index of all files in the SVG path. */
const index = new Map<string, string>();
const pathKey = 'TOBA_SVG_PATH';
const dist = path.resolve(__dirname, '..', 'es6');

interface File {
   name: string;
   slug: string;
   path: string;
}

/**
 * @example
 * /Volumes/GoogleDrive/My Drive/Business/Toba/Technical/Assets/IconJar.ijlibrary/Sets
 */
async function main() {
   const svgPath = process.env[pathKey];

   if (is.empty(svgPath)) {
      console.error(
         `❌ SVG path must be defined in the environment variable ${pathKey}`
      );
      return;
   }
   console.log(`Beginning SVG transformation from\n${svgPath}`);

   if (await !canAccess(svgPath)) {
      console.error('❌ SVG path does not exist or is not readable');
      return;
   }
   await loadFiles(svgPath);

   if (index.size === 0) {
      console.error('❓No SVG files were found');
      return;
   }

   console.log(`Found ${index.size} SVG files`);

   if (canAccess(dist)) {
      console.log('⌦ Removing existing JSX files');
      await empty(dist);
   } else {
      console.log('✨Creating output directory');
      fs.mkdirSync(dist);
   }

   const matches: File[] = [];

   Object.keys(icons).forEach(name => {
      const svgSlug = slug(icons[name])!;
      const fileName = svgSlug + '.svg';

      console.log(`Searching for ${fileName}`);

      if (index.has(fileName)) {
         console.log('✅ found');
         matches.push({
            name,
            slug: svgSlug,
            path: path.resolve(index.get(fileName)!, fileName)
         });
      } else {
         console.log('❌ not found');
      }
   });

   let out: string = '';

   matches.forEach(f => {
      convert(f);
      out += `export { ${f.name}SVG } from './${f.slug}';\n`;
   });

   writeFile('index', out);
}

/**
 * Whether SVG path can be accessed by the current user.
 */
const canAccess = (svgPath: string) =>
   new Promise<boolean>(resolve => {
      fs.access(svgPath, fs.constants.R_OK, err => {
         resolve(!is.value(err));
      });
   });

const loadFiles = (dir: string) =>
   new Promise(resolve => {
      fs.readdir(dir, { withFileTypes: true }, (err, files) => {
         if (is.value(err)) {
            console.error(`Could not read ${dir}`, err);
            return resolve();
         }
         files
            .filter(f => f.isFile() && f.name.endsWith('svg'))
            .forEach(f => index.set(f.name, dir));

         const subs = files.filter(f => f.isDirectory());

         Promise.all(subs.map(f => loadFiles(path.resolve(dir, f.name)))).then(
            resolve
         );
      });
   });

const empty = (dir: string) =>
   new Promise((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
         if (is.value(err)) {
            if (is.value(err)) {
               reject(err);
            }
         }
         let f: string | undefined;

         while ((f = files.pop()) != null) {
            fs.unlink(path.join(dir, f), err => {
               if (is.value(err)) {
                  reject(err);
               } else if (files.length == 0) {
                  resolve();
               }
            });
         }
      });
   });

function convert(file: File) {
   fs.readFile(file.path, { encoding: Encoding.UTF8 }, (err, data) => {
      if (is.value(err)) {
         console.error(err);
         return;
      }
      const webJSX = normalize(svgToJSX(data), file.name);
      const mobileJSX = normalize(svgToJSX(data, true), file.name);

      writeFile(file.slug, webJSX);
      writeFile(file.slug + '.mobile', mobileJSX);
   });
}

function writeFile(name: string, data: string) {
   fs.writeFile(path.resolve(dist, name + '.js'), data, err => {
      if (is.value(err)) {
         console.log(err);
      }
   });
}

const normalize = (jsx: string, fileName: string) =>
   jsx
      .replace('const SvgComponent', `export const ${fileName}SVG`)
      .replace(/\s+export default SvgComponent;/, '');

main();
