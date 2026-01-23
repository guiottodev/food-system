type AvailabilityInput = {
  sku?: { isActive?: boolean | null } | null;
  product?: { isActive?: boolean | null } | null;
};

export function isSkuAvailableInternal({ sku, product }: AvailabilityInput) {
  return Boolean(sku?.isActive && product?.isActive);
}
