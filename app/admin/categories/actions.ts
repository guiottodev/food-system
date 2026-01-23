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

async function getDescendantCategoryIds(tx: any, rootId: string) {
  const categories: Array<{ id: string; parentId: string | null }> =
    await tx.category.findMany({
    select: { id: true, parentId: true },
  });
  const childrenByParent = new Map<string, string[]>();
  for (const c of categories) {
    if (!c.parentId) continue;
    const list = childrenByParent.get(c.parentId) ?? [];
    list.push(c.id);
    childrenByParent.set(c.parentId, list);
  }
  const result: string[] = [];
  const stack = [...(childrenByParent.get(rootId) ?? [])];
  while (stack.length) {
    const id = stack.pop()!;
    result.push(id);
    const children = childrenByParent.get(id);
    if (children?.length) stack.push(...children);
  }
  return result;
}

export async function createCategoryAction(formData: FormData) {
  await requireAdminSession();
  const name = parseText(formData.get("name"));
  const description = parseText(formData.get("description"));
  const parentId = parseText(formData.get("parentId"));
  const isActive = parseBool(formData.get("isActive"));
  if (!name) {
    redirect("/admin/categories?error=nome&modal=1");
  }

  try {
    if (parentId) {
      const parent = await prisma.category.findUnique({
        where: { id: parentId },
        select: { id: true, isActive: true },
      });
      if (!parent || !parent.isActive) {
        redirect("/admin/categories?error=pai_invalido&modal=1");
      }
    }

    await prisma.category.create({
      data: {
        name,
        description: description || null,
        parentId: parentId || null,
        isActive,
      },
    });
  } catch {
    redirect("/admin/categories?error=duplicado&modal=1");
  }

  redirect("/admin/categories?notice=created");
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

  try {
    await prisma.$transaction(async (tx) => {
      const current = await tx.category.findUnique({
        where: { id },
        select: { parentId: true },
      });
      if (!current) {
        redirect("/admin/categories");
      }

      // Se ativando, validar que o pai (se existir) está ativo.
      if (isActive && current.parentId) {
        const parent = await tx.category.findUnique({
          where: { id: current.parentId },
          select: { isActive: true },
        });
        if (!parent?.isActive) {
          redirect("/admin/categories?error=pai_inativo");
        }
      }

      await tx.category.update({
        where: { id },
        data: {
          name,
          description: description || null,
          isActive,
        },
      });

      // Cascata (decisão 5A): ativar/desativar também afeta todos os descendentes.
      const descendantIds = await getDescendantCategoryIds(tx, id);
      if (descendantIds.length) {
        await tx.category.updateMany({
          where: { id: { in: descendantIds } },
          data: { isActive },
        });
      }
    });
  } catch {
    redirect("/admin/categories?error=duplicado");
  }

  redirect("/admin/categories?notice=updated");
}
