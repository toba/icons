import fs from 'fs';
import path from 'path';
import { is } from '@toba/tools/cjs';
import { icons } from './index';

/** Index of all files in the SVG path. */
const index = new Map<string, string>();
const pathKey = 'TOBA_SVG_PATH';

/**
 * @example
 * /Volumes/GoogleDrive/My Drive/Business/Toba/Technical/Assets/IconJar.ijlibrary/Sets
 */
async function main() {
   const svgPath = process.env[pathKey];

   if (is.empty(svgPath)) {
      console.error(
         `SVG path must be defined in the environment variable ${pathKey}`
      );
      return;
   }
   console.log(`Beginning SVG transformation from\n${svgPath}`);

   if (await !canAccess(svgPath)) {
      console.error('SVG path does not exist or is not readable');
      return;
   }
   await loadFiles(svgPath);

   if (index.size === 0) {
      console.error('No SVG files were found');
      return;
   }

   console.log(`Found ${index.size} SVG files`);
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

         return Promise.all(
            subs.map(f => loadFiles(path.resolve(dir, f.name)))
         ).then(resolve);
      });
   });

main();
