import type { ProductInventoryRow } from '@shopsense/shared';
import { moneyToPgNumeric } from '@shopsense/shared';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import type { ProductPatch } from './use-product-mutations';
import { productFormSchema, type ProductFormValues } from './product-schema';

function fieldClass(hasError: boolean) {
  return `mt-1 block h-touch w-full rounded-md border px-3 text-base text-ink-900 outline-none focus:border-brand-500 ${
    hasError ? 'border-danger-500' : 'border-border'
  }`;
}

export function ProductForm({
  product,
  onSubmit,
  onCancel,
  isSubmitting,
}: {
  product?: ProductInventoryRow;
  onSubmit: (patch: ProductPatch) => void;
  onCancel: () => void;
  isSubmitting: boolean;
}) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: product
      ? {
          name: product.name,
          sku: product.sku ?? '',
          unit: product.unit,
          unitsPerCarton: product.unitsPerCarton ? String(product.unitsPerCarton) : '',
          costPrice: moneyToPgNumeric(product.costPrice),
          sellingPrice: moneyToPgNumeric(product.sellingPrice),
          reorderThreshold: String(product.reorderThreshold),
        }
      : { unit: 'piece' },
  });

  function submit(values: ProductFormValues) {
    const patch: ProductPatch = {
      name: values.name,
      sku: values.sku || null,
      unit: values.unit,
      unitsPerCarton: values.unitsPerCarton ? Number(values.unitsPerCarton) : null,
      costPrice: values.costPrice,
      sellingPrice: values.sellingPrice,
      reorderThreshold: values.reorderThreshold ? Number(values.reorderThreshold) : 0,
    };
    onSubmit(patch);
  }

  return (
    <form onSubmit={handleSubmit(submit)} className="space-y-3 p-4">
      <h2 className="text-xl font-semibold text-ink-900">{product ? 'Edit product' : 'Add product'}</h2>

      <label className="block text-sm font-medium text-ink-700">
        Name
        <input {...register('name')} className={fieldClass(!!errors.name)} />
        {errors.name && <p className="mt-1 text-sm text-danger-600">{errors.name.message}</p>}
      </label>

      <label className="block text-sm font-medium text-ink-700">
        SKU / code (optional)
        <input {...register('sku')} className={fieldClass(false)} />
      </label>

      <div className="flex gap-3">
        <label className="block flex-1 text-sm font-medium text-ink-700">
          Base unit
          <select {...register('unit')} className={fieldClass(false)}>
            <option value="piece">Piece</option>
            <option value="carton">Carton</option>
          </select>
        </label>
        <label className="block flex-1 text-sm font-medium text-ink-700">
          Units per carton (optional)
          <input inputMode="numeric" {...register('unitsPerCarton')} className={fieldClass(!!errors.unitsPerCarton)} />
          {errors.unitsPerCarton && <p className="mt-1 text-sm text-danger-600">{errors.unitsPerCarton.message}</p>}
        </label>
      </div>

      <div className="flex gap-3">
        <label className="block flex-1 text-sm font-medium text-ink-700">
          Cost price (GH₵)
          <input inputMode="decimal" {...register('costPrice')} className={fieldClass(!!errors.costPrice)} />
          {errors.costPrice && <p className="mt-1 text-sm text-danger-600">{errors.costPrice.message}</p>}
        </label>
        <label className="block flex-1 text-sm font-medium text-ink-700">
          Selling price (GH₵)
          <input inputMode="decimal" {...register('sellingPrice')} className={fieldClass(!!errors.sellingPrice)} />
          {errors.sellingPrice && <p className="mt-1 text-sm text-danger-600">{errors.sellingPrice.message}</p>}
        </label>
      </div>

      <label className="block text-sm font-medium text-ink-700">
        Reorder threshold
        <input inputMode="numeric" {...register('reorderThreshold')} className={fieldClass(!!errors.reorderThreshold)} />
        {errors.reorderThreshold && <p className="mt-1 text-sm text-danger-600">{errors.reorderThreshold.message}</p>}
      </label>

      <div className="flex gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="h-touch flex-1 rounded-md border border-border text-base font-medium text-ink-900"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="h-touch flex-1 rounded-md bg-brand-600 text-base font-medium text-white disabled:opacity-50"
        >
          {isSubmitting ? 'Saving…' : 'Save'}
        </button>
      </div>
    </form>
  );
}
