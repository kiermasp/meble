import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Chip from "@mui/material/Chip";
import Stack from "@mui/material/Stack";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import TableSortLabel from "@mui/material/TableSortLabel";
import Typography from "@mui/material/Typography";
import {
  priceLabel,
  thicknessLabel,
  type CatalogBoard,
  type CatalogSort,
  type RowSort,
  type VariantGroup,
} from "../catalog";

const COLUMNS: Array<{ key: RowSort; label: string; align?: "right" }> = [
  { key: "thickness", label: "Grubość" },
  { key: "structure", label: "Struktura" },
  { key: "availability", label: "Dostępność" },
  { key: "price", label: "Cena/szt.", align: "right" },
];

export function ProductList(props: {
  groups: VariantGroup[];
  sort: CatalogSort;
  onRowSort: (key: RowSort) => void;
}) {
  if (props.groups.length === 0) {
    return <Typography color="text.secondary">Brak wariantów dla wybranych filtrów.</Typography>;
  }
  return (
    <Stack spacing={2}>
      {props.groups.map((group) => (
        <Card key={group.key}>
          <CardContent>
            <Typography variant="h6" component="h2" sx={{ mb: 1.5 }}>
              {group.title}
            </Typography>
            {group.stock.length > 0 ? (
              <VariantTable rows={group.stock} sort={props.sort} onRowSort={props.onRowSort} />
            ) : null}
            {group.ordered.length > 0 ? (
              <Box sx={{ mt: group.stock.length > 0 ? 2 : 0 }}>
                <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
                  Warianty na zamówienie
                </Typography>
                <VariantTable rows={group.ordered} sort={props.sort} onRowSort={props.onRowSort} />
              </Box>
            ) : null}
          </CardContent>
        </Card>
      ))}
    </Stack>
  );
}

function VariantTable(props: {
  rows: CatalogBoard[];
  sort: CatalogSort;
  onRowSort: (key: RowSort) => void;
}) {
  return (
    <Table size="small">
      <TableHead>
        <TableRow>
          {COLUMNS.map((column) => (
            <TableCell key={column.key} align={column.align} sortDirection={props.sort.rows === column.key ? props.sort.rowDirection : false}>
              <TableSortLabel
                active={props.sort.rows === column.key}
                direction={props.sort.rows === column.key ? props.sort.rowDirection : "asc"}
                onClick={() => props.onRowSort(column.key)}
              >
                {column.label}
              </TableSortLabel>
            </TableCell>
          ))}
        </TableRow>
      </TableHead>
      <TableBody>
        {props.rows.map((board) => (
          <TableRow key={board.mebleRefId} hover>
            <TableCell>{thicknessLabel(board.thicknessMm)}</TableCell>
            <TableCell>{board.structure || "—"}</TableCell>
            <TableCell>
              {board.availability ? <Chip size="small" variant="outlined" color={leadColor(board.availability)} label={board.availability} /> : "—"}
            </TableCell>
            <TableCell align="right">{priceLabel(board)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function leadColor(value: string): "success" | "warning" | "default" {
  if (/^\d+\s*h$/i.test(value)) return "success";
  const days = value.match(/^(\d+)\s*dni$/i);
  if (days && Number(days[1]) <= 7) return "warning";
  return "default";
}
