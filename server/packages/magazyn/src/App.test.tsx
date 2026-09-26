import { ThemeProvider } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import type { CatalogBoard } from "./catalog";
import { theme } from "./theme";

function board(overrides: Partial<CatalogBoard> = {}): CatalogBoard {
  return {
    mebleRefId: "5829997",
    displayName: "Płyta meblowa EGGER W960 SM Biały klasyczny 18 mm",
    categoryId: "cat-boards",
    category: "plyty-meblowe",
    categoryLabel: "Płyty meblowe",
    subtype: "bialy",
    manufacturerId: "m-egger",
    manufacturer: "Egger",
    decorCode: "W960",
    decorName: "Biały klasyczny",
    structure: "SM SemiMatt",
    thicknessMm: 18,
    format: "2070x2800",
    availability: "48h",
    unitPriceAmount: 227.45,
    currency: "PLN",
    decorKindId: "dk-mag",
    decorKind: "Magazynowe",
    waterResistance: "Suchotrwała",
    brightness: null,
    decorType: null,
    shade: null,
    color: "Biały klasyczny",
    statuses: [],
    updatedAt: "2026-09-26T10:00:00.000Z",
    ...overrides,
  };
}

const boards = [
  board(),
  board({
    mebleRefId: "5829998",
    structure: "ST9",
    thicknessMm: 36,
    availability: "7 dni",
    unitPriceAmount: 100,
  }),
  board({
    mebleRefId: "5999999",
    structure: "ST7",
    thicknessMm: 16,
    availability: "14 dni",
    unitPriceAmount: 344.74,
    decorKindId: "dk-prod",
    decorKind: "Produkcyjne (na zamówienie)",
  }),
  board({
    mebleRefId: "3149044",
    manufacturerId: "m-krono",
    manufacturer: "Kronospan",
    decorCode: "5981",
    decorName: "Kaszmir",
    structure: "BS",
    availability: "7 dni",
    unitPriceAmount: 205.61,
    color: "Kaszmir",
  }),
];

function renderApp() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("App", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        const url = String(input);
        const body =
          url === "/categories"
            ? [{ id: "cat-boards", code: "plyty-meblowe", name: "Płyty meblowe", sortOrder: 1, mebleRefId: "1" }]
            : url === "/manufacturers"
              ? [
                  { id: "m-egger", code: "egger", name: "Egger", sortOrder: 1, mebleRefId: "2962397" },
                  { id: "m-krono", code: "kronospan", name: "Kronospan", sortOrder: 2, mebleRefId: "3262928" },
                ]
              : url === "/decor-kinds"
                ? [
                    { id: "dk-mag", code: "magazynowe", name: "Magazynowe", sortOrder: 1, mebleRefId: "3263401" },
                    { id: "dk-prod", code: "produkcyjne-na-zamowienie", name: "Produkcyjne (na zamówienie)", sortOrder: 2, mebleRefId: "3263402" },
                    { id: "dk-new", code: "nowa-linia", name: "Nowa linia", sortOrder: 3, mebleRefId: null },
                  ]
                : boards;
        return { ok: true, headers: { get: () => "application/json" }, json: async () => body };
      }),
    );
  });

  it("shows decor blocks, separates order variants, and sorts rows by price", async () => {
    const user = userEvent.setup();
    renderApp();
    expect(await screen.findByRole("heading", { name: "Egger W960 Biały klasyczny" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kronospan 5981 Kaszmir" })).toBeInTheDocument();
    expect(screen.getByText("Warianty na zamówienie")).toBeInTheDocument();
    expect(screen.getByText("Producenci")).toBeInTheDocument();
    expect(screen.getByText("Kategoria")).toBeInTheDocument();
    expect(screen.getByRole("checkbox", { name: "Nowa linia" })).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Sortuj dekory" })).toBeInTheDocument();
    expect(screen.getAllByRole("columnheader", { name: "Aktualizacja" }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole("cell", { name: "26.09.2026, 12:00" }).length).toBeGreaterThan(0);

    const card = screen.getByRole("heading", { name: "Egger W960 Biały klasyczny" }).closest(".MuiCard-root");
    if (!(card instanceof HTMLElement)) throw new Error("missing decor card");
    const [stockTable] = within(card).getAllByRole("table");
    await user.click(within(stockTable).getByRole("button", { name: "Cena/szt." }));
    expect(within(stockTable).getAllByText(/zł$/).map((cell) => cell.textContent)).toEqual(["100,00 zł", "227,45 zł"]);
  });

  it("filters by producer without dropping the other choice", async () => {
    const user = userEvent.setup();
    renderApp();
    await screen.findByRole("heading", { name: "Kronospan 5981 Kaszmir" });
    const kronospan = screen.getAllByRole("checkbox", { name: "Kronospan" });
    expect(kronospan).toHaveLength(1);
    await user.click(kronospan[0]);
    expect(screen.queryByRole("heading", { name: "Egger W960 Biały klasyczny" })).not.toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Kronospan 5981 Kaszmir" })).toBeInTheDocument();
    expect(screen.getAllByRole("checkbox", { name: "Egger" })).toHaveLength(1);
  });
});
