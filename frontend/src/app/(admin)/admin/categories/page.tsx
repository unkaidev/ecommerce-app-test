'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { Category } from '@/types';

function CategoryRow({
  category,
  depth,
  onToggle,
}: {
  category: Category;
  depth: number;
  onToggle: (id: string, current: boolean) => void;
}) {
  return (
    <>
      <tr className="hover:bg-muted/30 transition-colors">
        <td className="px-4 py-3">
          <span
            className="font-medium"
            style={{ paddingLeft: `${depth * 16}px` }}
          >
            {depth > 0 && (
              <span className="text-muted-foreground mr-1" aria-hidden>
                └
              </span>
            )}
            {category.name}
          </span>
        </td>
        <td className="px-4 py-3 text-muted-foreground hidden md:table-cell font-mono text-xs">
          {category.slug}
        </td>
        <td className="px-4 py-3 text-center tabular-nums text-muted-foreground hidden lg:table-cell">
          {category.sortOrder}
        </td>
        <td className="px-4 py-3 text-center">
          <span
            className={
              category.isActive
                ? 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400'
                : 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium bg-muted text-muted-foreground'
            }
          >
            {category.isActive ? 'Active' : 'Inactive'}
          </span>
        </td>
        <td className="px-4 py-3 text-right">
          <div className="flex items-center justify-end gap-2">
            <button
              onClick={() => onToggle(category.id, category.isActive)}
              className="rounded px-2 py-1 text-xs font-medium hover:bg-accent transition-colors"
              aria-label={`${category.isActive ? 'Deactivate' : 'Activate'} ${category.name}`}
            >
              {category.isActive ? 'Deactivate' : 'Activate'}
            </button>
          </div>
        </td>
      </tr>
      {category.children?.map((child) => (
        <CategoryRow
          key={child.id}
          category={child}
          depth={depth + 1}
          onToggle={onToggle}
        />
      ))}
    </>
  );
}

function AddCategoryForm({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    setError(null);
    try {
      await api.categories.create({ name, parentId: parentId || undefined });
      setName('');
      setParentId('');
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create category');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex gap-3 flex-wrap">
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Category name"
        aria-label="New category name"
        required
        className="flex-1 min-w-[200px] rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <input
        type="text"
        value={parentId}
        onChange={(e) => setParentId(e.target.value)}
        placeholder="Parent category ID (optional)"
        aria-label="Parent category ID"
        className="w-64 rounded-md border px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
      />
      <button
        type="submit"
        disabled={isSubmitting}
        className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-70"
      >
        {isSubmitting ? 'Adding...' : 'Add Category'}
      </button>
      {error && <p role="alert" className="w-full text-sm text-destructive">{error}</p>}
    </form>
  );
}

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadCategories() {
    setIsLoading(true);
    setError(null);
    try {
      const data = await api.categories.list();
      setCategories(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load categories');
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadCategories();
  }, []);

  async function handleToggle(id: string, current: boolean) {
    try {
      await api.categories.update(id, { isActive: !current });
      await loadCategories();
    } catch {
      // Could show a toast; for now fail silently in the table
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">Categories</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Organize your product catalog with categories (max 3 levels deep)
        </p>
      </div>

      {/* Add form */}
      <section aria-label="Add category">
        <h2 className="text-sm font-semibold mb-3">Add New Category</h2>
        <AddCategoryForm onAdded={loadCategories} />
      </section>

      {/* Table */}
      <div>
        {isLoading ? (
          <div className="animate-pulse space-y-2" aria-label="Loading categories">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-11 rounded bg-muted" />
            ))}
          </div>
        ) : error ? (
          <div role="alert" className="rounded-md border border-destructive p-4 text-sm text-destructive">
            {error}
          </div>
        ) : (
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Name</th>
                  <th className="text-left px-4 py-3 font-medium hidden md:table-cell">Slug</th>
                  <th className="text-center px-4 py-3 font-medium hidden lg:table-cell">Sort</th>
                  <th className="text-center px-4 py-3 font-medium">Status</th>
                  <th className="text-right px-4 py-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {categories.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                      No categories yet. Add one above.
                    </td>
                  </tr>
                ) : (
                  categories.map((cat) => (
                    <CategoryRow
                      key={cat.id}
                      category={cat}
                      depth={0}
                      onToggle={handleToggle}
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
