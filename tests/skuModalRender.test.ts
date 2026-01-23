import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import ProductSkusSection from "../app/admin/products/[id]/ProductSkusSection.client";

describe("SKU modal render", () => {
  it("does not render Gerar nome or Sugestoes and disables Save when invalid", () => {
    const html = renderToStaticMarkup(
      createElement(ProductSkusSection, {
        productId: "prod-1",
        skus: [],
        createSkuAction: () => undefined,
        updateSkuAction: () => undefined,
        duplicateSkuAction: () => undefined,
        initialMode: "new",
      })
    );

    expect(html).not.toContain("Gerar nome");
    expect(html).not.toContain("Sugestoes");
    expect(html).toMatch(/<button[^>]*disabled[^>]*>Salvar<\/button>/);
  });
});
