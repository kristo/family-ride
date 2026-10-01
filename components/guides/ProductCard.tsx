import type { GuideProduct } from "@/lib/guides/types";

export function ProductCard({ product }: { product: GuideProduct }) {
  return (
    <li className="flex flex-col gap-4 rounded-2xl border border-[var(--line)] bg-[var(--paper)] p-5 sm:flex-row sm:items-start">
      {product.image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={product.image} alt={product.name} className="h-32 w-full rounded-xl object-cover sm:w-40" loading="lazy" />
      ) : null}
      <div className="flex-1">
        <h3 className="text-lg leading-tight font-bold">{product.name}</h3>
        <p className="mt-1 text-sm text-[var(--muted)]">{product.summary}</p>
        {product.pros && product.pros.length > 0 ? (
          <ul className="mt-3 list-disc space-y-1 pl-5 text-sm">
            {product.pros.map((pro) => (
              <li key={pro}>{pro}</li>
            ))}
          </ul>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-3">
          {/* sponsored: linki afiliacyjne muszą być tak oznaczone dla Google. */}
          <a
            href={product.affiliateUrl}
            target="_blank"
            rel="sponsored nofollow noopener noreferrer"
            className="rounded-full bg-[var(--accent)] px-4 py-2 text-sm font-bold text-white transition hover:brightness-110"
          >
            Sprawdź w {product.merchant}
          </a>
          {product.priceNote ? <span className="text-sm text-[var(--muted)]">{product.priceNote}</span> : null}
        </div>
      </div>
    </li>
  );
}
