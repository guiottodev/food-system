type CatalogAttributeType = "TEXTO" | "NUMERO" | "LISTA";

export type SkuAttributeDisplay = {
  key: string;
  value: string;
};

export type SkuAtributoRecord = {
  valueText: string | null;
  atributo: {
    name: string;
    type: CatalogAttributeType;
    unit: string | null;
  };
  atributoValor?: { value: string } | null;
};

export function buildSkuAttributesDisplay(
  rows: SkuAtributoRecord[]
): SkuAttributeDisplay[] {
  return rows
    .map((row) => {
      const name = row.atributo?.name ?? "";
      if (!name) return null;
      let value = "";
      if (row.atributo?.type === "LISTA") {
        value = row.atributoValor?.value ?? "";
      } else {
        value = row.valueText ?? "";
      }
      if (!value) return null;
      if (row.atributo?.type === "NUMERO" && row.atributo?.unit) {
        value = `${value} ${row.atributo.unit}`;
      }
      return { key: name, value };
    })
    .filter((item): item is SkuAttributeDisplay => Boolean(item));
}
