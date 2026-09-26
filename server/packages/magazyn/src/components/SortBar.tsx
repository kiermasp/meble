import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import MenuItem from "@mui/material/MenuItem";
import Select from "@mui/material/Select";
import Stack from "@mui/material/Stack";
import ToggleButton from "@mui/material/ToggleButton";
import ToggleButtonGroup from "@mui/material/ToggleButtonGroup";
import { GROUP_SORTS, type CatalogSort, type GroupSort, type SortDirection } from "../catalog";

const LABELS: Record<GroupSort, string> = {
  name: "Nazwa",
  manufacturer: "Producent",
  price: "Cena",
  thickness: "Grubość",
};

export function SortBar(props: {
  sort: CatalogSort;
  onChange: (sort: CatalogSort) => void;
}) {
  return (
    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} sx={{ mb: 2 }} alignItems={{ sm: "center" }}>
      <FormControl size="small" sx={{ minWidth: 200 }}>
        <InputLabel id="decor-sort">Sortuj dekory</InputLabel>
        <Select
          labelId="decor-sort"
          label="Sortuj dekory"
          value={props.sort.groups}
          onChange={(event) => props.onChange({ ...props.sort, groups: event.target.value as GroupSort })}
        >
          {GROUP_SORTS.map((sort) => (
            <MenuItem key={sort} value={sort}>
              {LABELS[sort]}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <ToggleButtonGroup
        exclusive
        size="small"
        color="primary"
        value={props.sort.groupDirection}
        onChange={(_event, direction: SortDirection | null) => {
          if (direction) props.onChange({ ...props.sort, groupDirection: direction });
        }}
      >
        <ToggleButton value="asc">Rosnąco</ToggleButton>
        <ToggleButton value="desc">Malejąco</ToggleButton>
      </ToggleButtonGroup>
    </Stack>
  );
}
