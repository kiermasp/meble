import { Injectable } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";

const USER_AGENT =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

const DIALOG_BODY = "nr=1&id=0&zakladka=plyty-meblowe&plytyId=0,0";

@Injectable()
export class MebleCatalogClient {
  constructor(private readonly config: ConfigService) {}

  async fetchBoardDialog(): Promise<string> {
    const base = (this.config.get<string>("MEBLE_BASE_URL") ?? "https://www.meble.pl").replace(/\/$/, "");
    const pageUrl = `${base}/rozkroj,plyty-meblowe`;
    const page = await fetch(pageUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent": USER_AGENT,
      },
      signal: AbortSignal.timeout(60_000),
    });
    if (!page.ok) {
      throw new Error(`Catalog page failed with HTTP ${page.status}`);
    }

    const response = await fetch(`${base}/rozkroj/go/ajaxRequest,showDialogPlyta`, {
      method: "POST",
      headers: {
        Accept: "text/html, */*; q=0.01",
        "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
        Cookie: cookieHeader(page),
        Origin: base,
        Referer: pageUrl,
        "User-Agent": USER_AGENT,
        "X-Requested-With": "XMLHttpRequest",
      },
      body: DIALOG_BODY,
      signal: AbortSignal.timeout(60_000),
    });
    if (!response.ok) {
      throw new Error(`Board dialog failed with HTTP ${response.status}`);
    }
    const html = await response.text();
    if (!html.includes("warstwa_wybierz_kolor_plyty-meblowe")) {
      throw new Error("Board dialog response did not contain the furniture-board catalog");
    }
    return html;
  }
}

function cookieHeader(response: Response): string {
  const headers = response.headers as Headers & { getSetCookie?: () => string[] };
  return (headers.getSetCookie?.() ?? [])
    .map((cookie) => cookie.split(";")[0]?.trim())
    .filter((cookie): cookie is string => Boolean(cookie))
    .join("; ");
}
