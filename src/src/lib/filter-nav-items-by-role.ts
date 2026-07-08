import type { NavItemConfig } from '@/types/nav';

export function filterNavItemsByRole(items: NavItemConfig[], role: unknown): NavItemConfig[] {
  const currentRole = typeof role === 'string' ? role : undefined;

  return items.reduce<NavItemConfig[]>((acc, item) => {
    if (item.roles && (!currentRole || !item.roles.includes(currentRole))) {
      return acc;
    }

    const childItems = item.items ? filterNavItemsByRole(item.items, currentRole) : undefined;

    if (item.items && !childItems?.length && !item.href) {
      return acc;
    }

    acc.push({
      ...item,
      ...(childItems ? { items: childItems } : {}),
    });

    return acc;
  }, []);
}
