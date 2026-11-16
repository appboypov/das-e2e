/** A cell colour as the screen model keeps it: the theme default, a palette index or an RGB value. */
export type ColorRef =
  | { readonly kind: 'default' }
  | { readonly kind: 'palette'; readonly index: number }
  | { readonly kind: 'rgb'; readonly value: number };
