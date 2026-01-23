import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProductSkusSection from "../app/admin/products/[id]/ProductSkusSection.client";

describe("ProductSkusSection banner", () => {
  it("shows banner when there is no active SKU", () => {
    const html = renderToStaticMarkup(
      createElement(ProductSkusSection, {
        productId: "prod-1",
        skus: [],
        createSkuAction: () => undefined,
        updateSkuAction: () => undefined,
        duplicateSkuAction: () => undefined,
      })
    );

    expect(html).toContain("Adicione pelo menos 1 SKU");
  });
});
