"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminSession } from "@/lib/adminAuth";

function parseText(value: FormDataEntryValue | null) {
  return String(value ?? "").trim();
}

function parseBool(value: FormDataEntryValue | null) {
  return value === "on";
}

export async function createCategoryAction(formData: FormData) {
  await requireAdminSession();
  const name = parseText(formData.get("name"));
  const description = parseText(formData.get("description"));
  const isActive = parseBool(formData.get("isActive"));
  if (!name) {
    redirect("/admin/categories?error=nome&modal=1");
  }

  await prisma.category.create({
    data: {
      name,
      description: description || null,
      isActive,
    },
  });

  redirect("/admin/categories");
}

export async function updateCategoryAction(formData: FormData) {
  await requireAdminSession();
  const id = parseText(formData.get("id"));
  const name = parseText(formData.get("name"));
  const description = parseText(formData.get("description"));
  const isActive = parseBool(formData.get("isActive"));
  if (!id || !name) {
    redirect("/admin/categories?error=nome");
  }

  await prisma.category.update({
    where: { id },
    data: {
      name,
      description: description || null,
      isActive,
    },
  });

  redirect("/admin/categories");
}
