import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";
import path from "node:path";
const photo = path.resolve("public/icon-192.png");
async function start(page: any) {
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar con ejemplos" }).click();
  await expect(page.getByText("Modo de prueba", { exact: true })).toBeVisible();
  await expect(page.locator(".garment-card")).toHaveCount(6);
}
async function nav(page: any, label: string) {
  const side = page.locator(".sidebar");
  if (await side.isVisible())
    await side
      .getByRole("button", { name: label, exact: label !== "Mi armario" })
      .click();
  else if (["Ajustes", "Categorías"].includes(label)) {
    await page.getByRole("button", { name: "Abrir menú secundario" }).click();
    await page
      .locator(".mobile-menu")
      .getByRole("button", { name: label, exact: label !== "Mi armario" })
      .click();
  } else
    await page
      .locator(".bottom-nav")
      .getByRole("button", {
        name:
          label === "Mi armario"
            ? "Armario"
            : label === "Mis outfits"
              ? "Outfits"
              : label,
        exact: true,
      })
      .click();
}
test("catálogo, varias fotos, recorte opcional, búsqueda, preferencias y CRUD", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", { name: "Añadir prenda", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog
    .getByLabel("Nombre *", { exact: true })
    .fill("Chaqueta de prueba");
  await dialog.getByLabel("Color", { exact: true }).fill("Verde");
  await dialog.getByLabel("Marca", { exact: true }).fill("Mi marca");
  await dialog
    .getByLabel("Etiquetas (separadas por coma)")
    .fill("trabajo, favorita");
  await dialog
    .locator("input[type=file]")
    .first()
    .setInputFiles([photo, photo]);
  await expect(
    dialog.getByAltText("Original 1", { exact: true }),
  ).toBeVisible();
  await expect(
    dialog.getByAltText("Original 2", { exact: true }),
  ).toBeVisible();
  await dialog
    .locator('input[type=file][accept="image/png,image/webp"]')
    .first()
    .setInputFiles(path.resolve("tests/fixtures/recorte.png"));
  await expect(dialog.getByAltText("Recorte 1", { exact: true })).toBeVisible();
  await dialog
    .getByRole("button", { name: "Guardar prenda", exact: true })
    .click();
  await expect(page.locator(".garment-card")).toHaveCount(7);
  await page.getByLabel("Buscar en armario", { exact: true }).fill("Chaqueta");
  await expect(page.locator(".garment-card")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Ver Chaqueta de prueba", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nombre *", { exact: true })
    .fill("Chaqueta editada");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar prenda", exact: true })
    .click();
  await expect(
    page.getByRole("button", { name: "Ver Chaqueta editada", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Vista lista", exact: true }).click();
  await page.reload();
  await expect(page.locator(".cards.list-view")).toBeVisible();
  await page
    .getByLabel("Buscar en armario", { exact: true })
    .fill("Chaqueta editada");
  await page
    .getByRole("button", { name: "Ver Chaqueta editada", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar", exact: true })
    .click();
  await expect(page.getByRole("dialog")).toHaveCount(0);
  await page.getByRole("button", { name: "Limpiar búsqueda" }).click();
  await expect(page.locator(".garment-card")).toHaveCount(6);
});
test("categorías editables y reclasificación sin referencias rotas", async ({
  page,
}) => {
  await start(page);
  await nav(page, "Categorías");
  await page.getByLabel("Nueva categoría", { exact: true }).fill("Abrigos");
  await page
    .getByRole("button", { name: "Añadir categoría", exact: true })
    .click();
  await expect(
    page.locator(".taxonomy-list").getByText("Abrigos", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("button", { name: "Editar categoría Abrigos", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByLabel("Nombre", { exact: true })
    .fill("Abrigos largos");
  await page
    .getByRole("button", { name: "Guardar nombre", exact: true })
    .click();
  await expect(
    page.locator(".taxonomy-list").getByText("Abrigos largos", { exact: true }),
  ).toBeVisible();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", {
      name: "Eliminar categoría pantalones de mezclilla",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Eliminar categoría pantalones de mezclilla",
      exact: true,
    }),
  ).toHaveCount(0);
  await nav(page, "Mi armario");
  await expect(page.locator(".garment-card")).toHaveCount(6);
});
test("outfit automático y libre, teclado, deshacer, recuperar, duplicar y foto real", async ({
  page,
}) => {
  await start(page);
  await nav(page, "Mis outfits");
  await page
    .getByRole("button", { name: "Crear outfit", exact: true })
    .first()
    .click();
  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Nombre del outfit *").fill("Mi look de prueba");
  await dialog
    .getByRole("button", { name: "Mezclilla de todos los días", exact: false })
    .click();
  await dialog
    .getByRole("button", { name: "Playera esencial", exact: false })
    .click();
  await expect(dialog.locator(".editable-piece")).toHaveCount(2);
  const piece = dialog.getByRole("button", {
    name: "Mover Mezclilla de todos los días",
    exact: true,
  });
  await piece.focus();
  const before = await piece.getAttribute("style");
  await piece.press("ArrowRight");
  await piece.press("]");
  expect(await piece.getAttribute("style")).not.toEqual(before);
  await dialog.getByRole("button", { name: "Deshacer", exact: true }).click();
  await dialog.getByRole("button", { name: "Rehacer", exact: true }).click();
  await dialog.locator("input[type=file]").first().setInputFiles(photo);
  await dialog
    .getByRole("button", { name: "Guardar outfit", exact: true })
    .click();
  await expect(page.locator(".outfit-card")).toHaveCount(2);
  await page
    .getByRole("button", { name: "Ver outfit Mi look de prueba", exact: true })
    .click();
  await expect(
    page
      .getByRole("dialog")
      .getByText("1 foto(s) del look puesto", { exact: true }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Editar", exact: true })
    .click();
  await expect(page.getByRole("dialog").locator(".editable-piece")).toHaveCount(
    2,
  );
  await expect(
    page.getByRole("dialog").getByLabel("Nombre del outfit *"),
  ).toHaveValue("Mi look de prueba");
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar outfit", exact: true })
    .click();
  await page
    .getByRole("button", { name: "Ver outfit Mi look de prueba", exact: true })
    .click();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Duplicar", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").getByRole("heading", {
      name: "Mi look de prueba (copia)",
      exact: true,
      level: 2,
    }),
  ).toBeVisible();
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
  await expect(page.locator(".outfit-card")).toHaveCount(3);
});
test("respaldo completo, restauración, tema persistente y accesibilidad básica", async ({
  page,
}) => {
  await start(page);
  await nav(page, "Ajustes");
  await page.getByLabel("Tema", { exact: true }).selectOption("light");
  await page
    .getByRole("button", { name: "Guardar preferencias", exact: true })
    .click();
  await page.reload();
  await nav(page, "Ajustes");
  await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
  const dl = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Exportar respaldo", exact: true })
    .click();
  const download = await dl;
  const saved = await download.path();
  page.once("dialog", (d) => d.accept());
  await page.locator('input[type=file][accept=".zip"]').setInputFiles(saved!);
  await expect(
    page.getByText("Guardado en modo de prueba", { exact: true }),
  ).toBeVisible();
  const a11y = await new AxeBuilder({ page }).analyze();
  expect(
    a11y.violations.filter((v) =>
      ["critical", "serious"].includes(v.impact || ""),
    ),
  ).toEqual([]);
  await nav(page, "Mi armario");
  await expect(page.locator(".garment-card")).toHaveCount(6);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
});
test("sin conectar no finge nube; recorrido visual sin errores JS", async ({
  page,
}, info) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(
    page.locator(".topbar").getByText("Sin conectar", { exact: true }),
  ).toBeVisible();
  await start(page);
  await page.screenshot({
    path: `test-results/${info.project.name}-armario.png`,
    fullPage: true,
  });
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBeTruthy();
  expect(errors).toEqual([]);
});
test("dos clientes: formulario obsoleto conserva propuesta y exige resolución", async ({
  page,
  context,
}) => {
  await start(page);
  const other = await context.newPage();
  await start(other);
  await other
    .getByRole("button", {
      name: "Editar Mezclilla de todos los días",
      exact: true,
    })
    .click();
  await other
    .getByRole("dialog")
    .getByLabel("Nombre *", { exact: true })
    .fill("Versión del segundo cliente");
  await page
    .getByRole("button", {
      name: "Agregar a favoritos: Playera esencial",
      exact: true,
    })
    .click();
  await expect(
    page.getByRole("button", {
      name: "Quitar de favoritos: Playera esencial",
      exact: true,
    }),
  ).toBeVisible();
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Guardar prenda", exact: true })
    .click();
  await expect(other.getByRole("dialog").getByRole("alert")).toContainText(
    "otro dispositivo",
  );
  await other
    .getByRole("dialog")
    .getByRole("button", { name: "Cerrar", exact: true })
    .click();
  await expect(
    other.getByRole("heading", {
      name: "Hay versiones que necesitan tu decisión",
    }),
  ).toBeVisible();
  await expect(
    other.getByText("Tu propuesta pendiente", { exact: true }),
  ).toBeVisible();
  other.once("dialog", (d) => d.accept());
  await other
    .locator(".conflict-options .panel")
    .last()
    .getByRole("button", { name: "Conservar esta versión", exact: true })
    .click();
  await expect(other.locator(".conflict-panel")).toHaveCount(0);
  await expect(
    other.getByRole("button", {
      name: "Ver Versión del segundo cliente",
      exact: true,
    }),
  ).toBeVisible();
  await other.close();
});
test("eliminar prenda relacionada advierte y actualiza el outfit", async ({
  page,
}) => {
  await start(page);
  await page
    .getByRole("button", {
      name: "Ver Mezclilla de todos los días",
      exact: true,
    })
    .click();
  let warning = "";
  page.once("dialog", async (d) => {
    warning = d.message();
    await d.accept();
  });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Eliminar", exact: true })
    .click();
  await expect(page.locator(".garment-card")).toHaveCount(5);
  expect(warning).toContain("Se usa en 1 outfit");
  await nav(page, "Mis outfits");
  await page
    .getByRole("button", { name: "Ver outfit Sin prisa", exact: true })
    .click();
  await expect(
    page.getByRole("dialog").locator(".composition-piece"),
  ).toHaveCount(2);
  await expect(
    page
      .getByRole("dialog")
      .getByText("Mezclilla de todos los días", { exact: true }),
  ).toHaveCount(0);
});
