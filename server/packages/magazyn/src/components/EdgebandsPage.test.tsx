import { ThemeProvider } from "@mui/material/styles";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "../App";
import type { CatalogEdgeband } from "../edgebands";
import { theme } from "../theme";

function band(overrides: Partial<CatalogEdgeband> = {}): CatalogEdgeband {
  return {
    mebleRefId: "1050019",
    displayName: "Obrzeże ABS U702 ST9 Kaszmir 23 x 0.8 mm Egger",
    code: "U702",
    name: "Kaszmir",
    manufacturer: "Egger",
    structure: "ST9",
    widthMm: 23,
    thicknessMm: 0.8,
    availability: "24h",
    unitPriceAmount: 1.67,
    currency: "PLN",
    updatedAt: "2026-09-26T12:00:00.000Z",
    ...overrides,
  };
}

const rows = [
  band(),
  band({
    mebleRefId: "200",
    code: "W960",
    name: "Biały",
    thicknessMm: 2,
    availability: "7 dni",
    unitPriceAmount: 3.5,
  }),
  band({
    mebleRefId: "300",
    displayName: "Obrzeże REHAU 2464L Noble Matt",
    code: "2464L",
    name: "Noble Matt",
    manufacturer: "REHAU",
    thicknessMm: 1,
    availability: "48h",
    unitPriceAmount: 0.9,
  }),
];

function renderPage() {
  return render(
    <ThemeProvider theme={theme}>
      <MemoryRouter initialEntries={["/obrzeza"]}>
        <App />
      </MemoryRouter>
    </ThemeProvider>,
  );
}

describe("EdgebandsPage", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async (input: RequestInfo | URL) => {
        if (String(input) !== "/edgebands") throw new Error(`unexpected ${String(input)}`);
        return {
          ok: true,
          headers: { get: () => "application/json" },
          json: async () => rows,
        };
      }),
    );
  });

  it("searches by manufacturer and sorts the visible price column", async () => {
    const user = userEvent.setup();
    renderPage();
    expect(await screen.findByRole("cell", { name: "U702" })).toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "2464L" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Szerokość" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Grubość" })).toBeInTheDocument();
    expect(screen.getByRole("columnheader", { name: "Aktualizacja" })).toBeInTheDocument();
    expect(screen.getAllByRole("cell", { name: "26.09.2026, 14:00" }).length).toBeGreaterThan(0);

    await user.type(screen.getByRole("textbox", { name: "Szukaj obrzeża" }), "egger");
    expect(screen.queryByRole("cell", { name: "2464L" })).not.toBeInTheDocument();
    expect(screen.getByRole("cell", { name: "U702" })).toBeInTheDocument();

    await user.clear(screen.getByRole("textbox", { name: "Szukaj obrzeża" }));
    const table = screen.getByRole("table");
    await user.click(within(table).getByRole("button", { name: "Cena" }));
    expect(within(table).getAllByText(/zł$/).map((cell) => cell.textContent)).toEqual(["0,90 zł", "1,67 zł", "3,50 zł"]);
  });
});
