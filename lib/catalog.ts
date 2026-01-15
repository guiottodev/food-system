type SellableSkuInput = {
  sku: {
    isActive: boolean;
  };
  product: {
    isActive: boolean;
    isPublicHidden?: boolean | null;
  };
};

export function isSkuSellableInternal({
  sku,
  product,
}: SellableSkuInput): boolean {
  return Boolean(sku?.isActive && product?.isActive);
}
