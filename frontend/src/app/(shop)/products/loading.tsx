import { ProductGridSkeleton } from '@/components/products/ProductCard';

export default function ProductsLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col lg:flex-row gap-8">
        <div className="w-full lg:w-64 shrink-0">
          <div className="h-6 w-24 rounded bg-muted animate-pulse mb-4" />
          <div className="space-y-3">
            <div className="h-9 rounded bg-muted animate-pulse" />
            <div className="h-9 rounded bg-muted animate-pulse" />
          </div>
        </div>
        <div className="flex-1">
          <ProductGridSkeleton count={8} />
        </div>
      </div>
    </div>
  );
}
