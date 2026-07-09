export interface NavItemConfig {
  key: string;
  title?: string;
  titleKey?: string;
  disabled?: boolean;
  external?: boolean;
  implemented?: boolean;
  label?: string;
  icon?: string;
  href?: string;
  roles?: string[];
  items?: NavItemConfig[];
  // Matcher cannot be a function in order
  // to be able to use it on the server.
  // If you need to match multiple paths,
  // can extend it to accept multiple matchers.
  matcher?:
    | { type: 'startsWith' | 'equals'; href: string }
    | { type: 'startsWithExcept'; href: string; excludeHrefs: string[] };
}
