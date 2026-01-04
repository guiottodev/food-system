"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

function parseText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

export async function createCategoryAction(formData: FormData) {
  const name = parseText(formData.get("name"));
  const description = parseText(formData.get("description"));
  if (!name) {
    redirect("/admin/categories?error=nome");
  }

  await prisma.category.create({
    data: {
      name,
      description: description || null,
    },
  });

  redirect("/admin/categories");
}

export async function updateCategoryAction(formData: FormData) {
  const id = parseText(formData.get("id"));
  const name = parseText(formData.get("name"));
  const description = parseText(formData.get("description"));
  if (!id || !name) {
    redirect("/admin/categories?error=nome");
  }

  await prisma.category.update({
    where: { id },
    data: {
      name,
      description: description || null,
    },
  });

  redirect("/admin/categories");
}
