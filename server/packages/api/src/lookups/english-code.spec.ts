import { englishCode } from "./english-code";

describe("englishCode", () => {
  it("folds Polish letters and keeps the shop wording recognizable", () => {
    expect(englishCode("Produkcyjne (na zamówienie)")).toBe("produkcyjne-na-zamowienie");
    expect(englishCode("Suchotrwała")).toBe("suchotrwala");
    expect(englishCode("Kolekcja 26+")).toBe("kolekcja-26");
    expect(englishCode("SWISS KRONO")).toBe("swiss-krono");
  });
});
