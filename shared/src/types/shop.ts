declare const ShopIdBrand: unique symbol;
export type ShopId = string & { readonly [ShopIdBrand]: typeof ShopIdBrand };

export function shopId(id: string): ShopId {
  return id as ShopId;
}
