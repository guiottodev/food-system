"use client";

import { useRouter, useSearchParams } from "next/navigation";
import layoutStyles from "./products.module.css";
import FilterSelect from "./FilterSelect.client";

type PageSizeSelectProps = {
  currentPageSize: number;
  pageSizes: number[];
};

export default function PageSizeSelect({ currentPageSize, pageSizes }: PageSizeSelectProps) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const handleChange = (value: string) => {
    const newSize = Number(value);
    const params = new URLSearchParams(searchParams.toString());
    
    // Define o novo pageSize
    if (newSize !== pageSizes[0]) {
      params.set("pageSize", String(newSize));
    } else {
      params.delete("pageSize");
    }
    
    // Reseta para página 1
    params.set("page", "1");
    
    router.push(`/admin/products?${params.toString()}`);
  };

  const options = pageSizes.map((size) => ({
    value: String(size),
    label: String(size),
  }));

  return (
    <div className={layoutStyles.pageSizeSelectWrap}>
      <label className={layoutStyles.pageSizeLabel}>
        Exibir
      </label>
      <FilterSelect
        options={options}
        value={String(currentPageSize)}
        onChange={handleChange}
        placeholder={String(pageSizes[0])}
        aria-label="Itens por página"
      />
    </div>
  );
}
