import Link from 'next/link';

export type BreadcrumbItem = { label: string; href?: string };

export function PageBreadcrumb({ items }: { items: BreadcrumbItem[] }) {
  return (
    <nav aria-label="Breadcrumb" className="text-sm text-um-text mb-3">
      <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1 list-none p-0 m-0">
        {items.map((item, i) => (
          <li key={`${item.label}-${i}`} className="flex items-center gap-1.5">
            {i > 0 ? (
              <span aria-hidden className="text-um-text/70">
                /
              </span>
            ) : null}
            {item.href ? (
              <Link href={item.href} className="text-um-link no-underline hover:underline">
                {item.label}
              </Link>
            ) : (
              <span className="text-black font-medium">{item.label}</span>
            )}
          </li>
        ))}
      </ol>
    </nav>
  );
}
