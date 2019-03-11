import fs from 'fs';
import path from 'path';
import { is, slug, Encoding } from '@toba/node-tools';
import { svgToJSX } from '@toba/svg-transformer';
import { IconFiles } from './config';
import { icons } from './index';

/** Index of all files in the SVG path. */
const index = new Map<string, string>();
const pathKey = 'TOBA_SVG_PATH';
/** Folder where components will be written. */
const dist = path.resolve(__dirname, '..', 'es6');

interface File {
   name: string;
   slug: string;
   path: string;
}

/**
 * Entry method to load and convert mapped SVG files.
 * @param icons Component name mapped to file name
 * @example
 * /Volumes/GoogleDrive/My Drive/Business/Toba/Technical/Assets/IconJar.ijlibrary/Sets
 */
async function main(icons: IconFiles) {
   const svgPath = process.env[pathKey];

   if (is.empty(svgPath)) {
      console.error(
         `❌ SVG path must be defined in the environment variable ${pathKey}`
      );
      return;
   }
   console.log(`Beginning SVG transformation from\n${svgPath}`);

   if (await !canRead(svgPath)) {
      console.error('❌ SVG path does not exist or is not readable');
      return;
   }
   await loadFiles(svgPath);

   if (index.size === 0) {
      console.error('❓No SVG files were found');
      return;
   }

   console.log(`Found ${index.size} SVG files`);

   if (await canWrite(dist)) {
      console.log('🚽 Removing existing components');
      await empty(dist);
   } else {
      console.log('✨Creating output directory');
      fs.mkdirSync(dist);
   }

   const matches = findFiles(icons, index);
   let out: string = '';

   matches.forEach(f => {
      convert(f);
      out += `export { ${f.name}SVG } from './${f.slug}';\n`;
   });

   writeFile('index', out);
   writeFile('index', out, 'd.ts');
}

/**
 * Whether SVG path can be accessed by the current user.
 */
const canAccess = (dir: string, accessType: number) =>
   new Promise<boolean>(resolve => {
      fs.access(dir, accessType | fs.constants.F_OK, err => {
         resolve(err === null);
      });
   });

const canRead = (dir: string) => canAccess(dir, fs.constants.R_OK);
const canWrite = (dir: string) => canAccess(dir, fs.constants.W_OK);

/**
 * Update global `index` with all SVG files within the given folder.
 */
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

/**
 * Find desired icons among all SVG files.
 * @param icons Component name mapped to file name
 * @param index All SVG files
 */
function findFiles(icons: IconFiles, index: Map<string, string>) {
   const matches: File[] = [];

   Object.keys(icons).forEach(name => {
      const svgSlug = slug(icons[name].name)!;
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
   return matches;
}

/**
 * Remove all files within the given folder.
 */
const empty = (dir: string) =>
   new Promise((resolve, reject) => {
      fs.readdir(dir, (err, files) => {
         if (is.value(err)) {
            reject(err);
            console.error(err);
            return;
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

/**
 * Create React Component and TypesScript definition files from SVG content.
 * @param file Matched SVG file
 * @see https://www.smooth-code.com/open-source/svgr/docs/typescript/
 */
function convert(file: File) {
   fs.readFile(file.path, { encoding: Encoding.UTF8 }, (err, data) => {
      if (is.value(err)) {
         console.error(err);
         return;
      }
      const webJSX = normalize(svgToJSX(data), file.name);
      const mobileJSX = normalize(svgToJSX(data, true), file.name);
      const def = `import React from 'react';
declare const ${
         file.name
      }SVG: React.FunctionComponent<React.SVGProps<SVGSVGElement>>;`;

      writeFile(file.slug, webJSX);
      writeFile(file.slug, mobileJSX, 'mobile.js');
      writeFile(file.slug, def, 'd.ts');
   });
}

/**
 * Write file content to standard output path.
 */
function writeFile(name: string, data: string, ext = 'js') {
   fs.writeFile(path.resolve(dist, name + '.' + ext), data, err => {
      if (is.value(err)) {
         console.log(err);
      }
   });
}

/**
 * Adjust the SVGR generated component. SVGR supports custom templates to
 * manipulate the AST but this is simpler.
 */
const normalize = (jsx: string, fileName: string) =>
   jsx
      .replace('const SvgComponent', `export const ${fileName}SVG`)
      .replace(/\s+export default SvgComponent;/, '');

main(icons);
