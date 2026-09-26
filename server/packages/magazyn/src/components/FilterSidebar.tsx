import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import Chip from "@mui/material/Chip";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Typography from "@mui/material/Typography";
import { FILTER_GROUPS, filterOptions, type CatalogBoard, type FilterGroup, type WarehouseFilters } from "../catalog";
import type { LookupRecord } from "../lookups";

const OPEN_BY_DEFAULT = new Set<keyof WarehouseFilters>([
  "category",
  "manufacturer",
  "thickness",
  "structure",
  "decorKind",
  "format",
  "waterResistance",
]);

export function FilterSidebar(props: {
  boards: CatalogBoard[];
  lookups: CatalogLookups;
  filters: WarehouseFilters;
  onToggle: (name: keyof WarehouseFilters, value: string) => void;
  onClear: () => void;
}) {
  const active = FILTER_GROUPS.some((group) => (props.filters[group.name] ?? []).length > 0);
  return (
    <Box sx={{ px: 1, pb: 2 }}>
      <Button variant="text" onClick={props.onClear} disabled={!active} fullWidth sx={{ mb: 1, justifyContent: "flex-start" }}>
        Wyczyść filtry
      </Button>
      {FILTER_GROUPS.map((group) => {
        const values = optionsFor(group, props.boards, props.lookups);
        if (values.length === 0) return null;
        const selected = props.filters[group.name] ?? [];
        return (
          <Accordion key={group.name} disableGutters defaultExpanded={OPEN_BY_DEFAULT.has(group.name)}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flex: 1 }}>{group.label}</Typography>
              {selected.length > 0 ? <Chip size="small" color="primary" label={selected.length} /> : null}
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <FormGroup sx={{ maxHeight: 220, overflow: "auto", flexWrap: "nowrap" }}>
                {values.map((value) => (
                  <FormControlLabel
                    key={value.value}
                    control={
                      <Checkbox
                        size="small"
                        checked={selected.includes(value.value)}
                        onChange={() => props.onToggle(group.name, value.value)}
                      />
                    }
                    label={value.label}
                  />
                ))}
              </FormGroup>
            </AccordionDetails>
          </Accordion>
        );
      })}
    </Box>
  );
}

export interface CatalogLookups {
  category: LookupRecord[];
  manufacturer: LookupRecord[];
  decorKind: LookupRecord[];
}

function optionsFor(group: FilterGroup, boards: CatalogBoard[], lookups: CatalogLookups): { value: string; label: string }[] {
  const dictionary = dictionaryFor(group.name, lookups);
  if (dictionary) {
    return [...dictionary]
      .sort((left, right) => left.sortOrder - right.sortOrder || left.name.localeCompare(right.name, "pl"))
      .map((row) => ({ value: row.id, label: row.name }));
  }
  return filterOptions(boards, group).map((value) => ({ value, label: group.optionLabel(value) }));
}

function dictionaryFor(name: keyof WarehouseFilters, lookups: CatalogLookups): LookupRecord[] | null {
  if (name === "category") return lookups.category;
  if (name === "manufacturer") return lookups.manufacturer;
  if (name === "decorKind") return lookups.decorKind;
  return null;
}
