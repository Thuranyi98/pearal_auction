export const NOT_FOR_SALE_TAG = "[NOT_FOR_SALE]";

export function isLotNotForSale(lot: { description?: string | null }) {
  return String(lot.description ?? "").includes(NOT_FOR_SALE_TAG);
}

export function setNotForSaleTag(description: string | null | undefined, notForSale: boolean) {
  const raw = String(description ?? "");
  const cleaned = raw.replace(NOT_FOR_SALE_TAG, "").trim();
  if (notForSale) {
    return cleaned ? `${NOT_FOR_SALE_TAG} ${cleaned}` : NOT_FOR_SALE_TAG;
  }
  return cleaned || null;
}
