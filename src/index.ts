import { normalize } from './config';

/**
 * Map intended component name to SVG file name (without extension) or
 * file configuration.
 */
export const icons = normalize({
   Amazon: 'Amazon',
   ArrowBack: 'arrow-thick-circle-left', // Arrow Circle Left
   ArrowForward: 'arrow-thick-circle-right', // Arrow Circle Right
   Dropbox: 'Dropbox',
   Facebook: 'Facebook',
   GitHub: 'Github',
   Google: 'Google',
   Logo: { name: 'Toba Logo', preserveCSS: true },
   NavMenuHorizontal: 'navigation-menu-horizontal',
   NavMenuVertical: 'navigation-menu-vertical',
   Settings: 'cog',
   Yahoo: 'Yahoo'
});
