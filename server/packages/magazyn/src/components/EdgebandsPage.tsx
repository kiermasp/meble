import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Paper from "@mui/material/Paper";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TablePagination from "@mui/material/TablePagination";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import TextField from "@mui/material/TextField";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  EDGEBAND_PAGE_SIZE,
  browseEdgebands,
  edgebandPrice,
  edgebandUpdated,
  isCatalogEdgeband,
  millimetres,
  pageOf,
  readEdgebandView,
  writeEdgebandView,
  type CatalogEdgeband,
  type EdgebandSort,
  type EdgebandView,
} from "../edgebands";
import { WarehouseNav } from "./WarehouseNav";

const COLUMNS: { key: EdgebandSort; label: string }[] = [
  { key: "code", label: "Kod" },
  { key: "name", label: "Nazwa" },
  { key: "manufacturer", label: "Producent" },
  { key: "width", label: "Szerokość" },
  { key: "thickness", label: "Grubość" },
  { key: "availability", label: "Dostępność" },
  { key: "price", label: "Cena" },
  { key: "updated", label: "Aktualizacja" },
];

export function EdgebandsPage() {
  const [params, setParams] = useSearchParams();
  const view = readEdgebandView(params);
  const [rows, setRows] = useState<CatalogEdgeband[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    loadEdgebands()
      .then((next) => {
        if (cancelled) return;
        setRows(next);
        setError(false);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const matched = browseEdgebands(rows, view);
  const page = Math.min(view.page, Math.max(0, Math.ceil(matched.length / EDGEBAND_PAGE_SIZE) - 1));
  const visible = pageOf(matched, page);

  function commit(next: EdgebandView) {
    setParams(writeEdgebandView(next), { replace: true });
  }

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="fixed">
        <Toolbar>
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Magazyn
          </Typography>
          <WarehouseNav />
          <Typography variant="body2" sx={{ ml: 2 }}>
            {loading ? "" : `${matched.length} z ${rows.length}`}
          </Typography>
        </Toolbar>
      </AppBar>
      <Box component="main" sx={{ p: { xs: 2, md: 3 } }}>
        <Toolbar />
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Obrzeża z katalogu meble.pl.
        </Typography>
        <TextField
          label="Szukaj obrzeża"
          placeholder="Kod, nazwa lub producent"
          value={view.query}
          onChange={(event) => commit({ ...view, query: event.target.value, page: 0 })}
          sx={{ mb: 2, width: { xs: "100%", sm: 420 } }}
        />
        {error ? <Alert severity="error">Nie udało się pobrać obrzeży.</Alert> : null}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <Paper>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    {COLUMNS.map((column) => (
                      <TableCell key={column.key} sortDirection={view.sort === column.key ? view.direction : false}>
                        <TableSortLabel
                          active={view.sort === column.key}
                          direction={view.sort === column.key ? view.direction : "asc"}
                          onClick={() =>
                            commit({
                              ...view,
                              sort: column.key,
                              direction: view.sort === column.key && view.direction === "asc" ? "desc" : "asc",
                              page: 0,
                            })
                          }
                        >
                          {column.label}
                        </TableSortLabel>
                      </TableCell>
                    ))}
                  </TableRow>
                </TableHead>
                <TableBody>
                  {visible.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={COLUMNS.length}>Brak obrzeży dla tego wyszukiwania.</TableCell>
                    </TableRow>
                  ) : (
                    visible.map((row) => (
                      <TableRow key={row.mebleRefId} hover>
                        <TableCell>{row.code ?? "—"}</TableCell>
                        <TableCell>{row.name ?? "—"}</TableCell>
                        <TableCell>{row.manufacturer ?? "—"}</TableCell>
                        <TableCell>{millimetres(row.widthMm)}</TableCell>
                        <TableCell>{millimetres(row.thicknessMm)}</TableCell>
                        <TableCell>{row.availability ?? "—"}</TableCell>
                        <TableCell>{edgebandPrice(row)}</TableCell>
                        <TableCell>{edgebandUpdated(row)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
            <TablePagination
              component="div"
              count={matched.length}
              page={page}
              rowsPerPage={EDGEBAND_PAGE_SIZE}
              rowsPerPageOptions={[EDGEBAND_PAGE_SIZE]}
              onPageChange={(_event, nextPage) => commit({ ...view, page: nextPage })}
              labelRowsPerPage="Wierszy na stronę"
              labelDisplayedRows={({ from, to, count }) => `${from}–${to} z ${count}`}
            />
          </Paper>
        )}
      </Box>
    </Box>
  );
}

async function loadEdgebands(): Promise<CatalogEdgeband[]> {
  const response = await fetch("/edgebands");
  if (!response.ok) throw new Error("Edgeband request failed");
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("Edgeband response was not JSON");
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isCatalogEdgeband)) throw new Error("Edgeband JSON is not a list");
  return body;
}
