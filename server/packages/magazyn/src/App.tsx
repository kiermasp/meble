import FilterListIcon from "@mui/icons-material/FilterList";
import Alert from "@mui/material/Alert";
import AppBar from "@mui/material/AppBar";
import Box from "@mui/material/Box";
import CircularProgress from "@mui/material/CircularProgress";
import Drawer from "@mui/material/Drawer";
import IconButton from "@mui/material/IconButton";
import Toolbar from "@mui/material/Toolbar";
import Typography from "@mui/material/Typography";
import useMediaQuery from "@mui/material/useMediaQuery";
import { useTheme } from "@mui/material/styles";
import { useEffect, useState } from "react";
import { Route, Routes, useSearchParams } from "react-router-dom";
import { EdgebandsPage } from "./components/EdgebandsPage";
import { WarehouseNav } from "./components/WarehouseNav";
import {
  isCatalogBoard,
  readViewState,
  toggleFilter,
  viewCatalog,
  writeViewState,
  type CatalogBoard,
  type CatalogSort,
  type RowSort,
  type WarehouseFilters,
} from "./catalog";
import { FilterSidebar, type CatalogLookups } from "./components/FilterSidebar";
import { loadLookups } from "./lookups";
import { ProductList } from "./components/ProductList";
import { SortBar } from "./components/SortBar";
import { drawerWidth } from "./theme";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<BoardsPage />} />
      <Route path="/obrzeza" element={<EdgebandsPage />} />
    </Routes>
  );
}

function BoardsPage() {
  const theme = useTheme();
  const mobile = useMediaQuery(theme.breakpoints.down("md"));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [params, setParams] = useSearchParams();
  const { filters, sort } = readViewState(params);
  const [boards, setBoards] = useState<CatalogBoard[]>([]);
  const [lookups, setLookups] = useState<CatalogLookups>({ category: [], manufacturer: [], decorKind: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadCatalog(), loadLookups("/categories"), loadLookups("/manufacturers"), loadLookups("/decor-kinds")])
      .then(([next, category, manufacturer, decorKind]) => {
        if (cancelled) return;
        setBoards(next);
        setLookups({ category, manufacturer, decorKind });
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

  function commit(nextFilters: WarehouseFilters, nextSort: CatalogSort) {
    setParams(writeViewState(nextFilters, nextSort), { replace: true });
  }

  const groups = viewCatalog(boards, filters, sort);
  const visibleCount = groups.reduce((sum, group) => sum + group.stock.length + group.ordered.length, 0);
  const drawer = (
    <FilterSidebar
      boards={boards}
      lookups={lookups}
      filters={filters}
      onToggle={(name, value) => commit(toggleFilter(filters, name, value), sort)}
      onClear={() => commit({}, sort)}
    />
  );

  return (
    <Box sx={{ display: "flex", minHeight: "100vh", bgcolor: "background.default" }}>
      <AppBar position="fixed" sx={{ zIndex: theme.zIndex.drawer + 1 }}>
        <Toolbar>
          {mobile ? (
            <IconButton color="inherit" edge="start" aria-label="Filtry" onClick={() => setFiltersOpen(true)} sx={{ mr: 1 }}>
              <FilterListIcon />
            </IconButton>
          ) : null}
          <Typography variant="h6" component="h1" sx={{ flexGrow: 1 }}>
            Magazyn
          </Typography>
          <WarehouseNav />
          <Typography variant="body2" sx={{ ml: 2 }}>
            {loading ? "" : `${visibleCount} z ${boards.length}`}
          </Typography>
        </Toolbar>
      </AppBar>
      <Drawer
        variant={mobile ? "temporary" : "permanent"}
        open={mobile ? filtersOpen : true}
        onClose={() => setFiltersOpen(false)}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          "& .MuiDrawer-paper": { width: drawerWidth, boxSizing: "border-box", borderColor: "divider", bgcolor: "background.paper" },
        }}
      >
        <Toolbar />
        {drawer}
      </Drawer>
      <Box component="main" sx={{ flexGrow: 1, p: { xs: 2, md: 3 }, width: { md: `calc(100% - ${drawerWidth}px)` } }}>
        <Toolbar />
        <Typography color="text.secondary" sx={{ mb: 2 }}>
          Płyty meblowe z katalogu meble.pl.
        </Typography>
        {error ? <Alert severity="error">Nie udało się pobrać katalogu.</Alert> : null}
        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress />
          </Box>
        ) : (
          <>
            <SortBar sort={sort} onChange={(next) => commit(filters, next)} />
            <ProductList
              groups={groups}
              sort={sort}
              onRowSort={(key: RowSort) =>
                commit(filters, {
                  ...sort,
                  rows: key,
                  rowDirection: sort.rows === key && sort.rowDirection === "asc" ? "desc" : "asc",
                })
              }
            />
          </>
        )}
      </Box>
    </Box>
  );
}

async function loadCatalog(): Promise<CatalogBoard[]> {
  const response = await fetch("/materials");
  if (!response.ok) throw new Error("Catalog request failed");
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) throw new Error("Catalog response was not JSON");
  const body: unknown = await response.json();
  if (!Array.isArray(body) || !body.every(isCatalogBoard)) throw new Error("Catalog JSON is not a board list");
  return body;
}
