import { is } from '@toba/node-tools';

export interface IconFileConfig {
   /** File name without extension. */
   name: string;
   /**
    * Whether to preserve CSS class name attributes. By default they are
    * removed.
    */
   preserveCSS?: boolean;
}

export type IconDefinition = { [key: string]: IconFileConfig | string };

export type IconFiles = { [key: string]: IconFileConfig };

export function normalize(defs: IconDefinition): IconFiles {
   const icons: IconFiles = {};

   Object.keys(defs).forEach(name => {
      const value = defs[name];
      icons[name] = is.text(value) ? { name: value } : value;
   });

   return icons;
}
