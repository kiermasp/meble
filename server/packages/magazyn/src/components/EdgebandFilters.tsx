import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import Accordion from "@mui/material/Accordion";
import AccordionDetails from "@mui/material/AccordionDetails";
import AccordionSummary from "@mui/material/AccordionSummary";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Checkbox from "@mui/material/Checkbox";
import FormControlLabel from "@mui/material/FormControlLabel";
import FormGroup from "@mui/material/FormGroup";
import Typography from "@mui/material/Typography";
import {
  edgebandFilterOptions,
  EDGEBAND_FILTER_NAMES,
  type CatalogEdgeband,
  type EdgebandFilterName,
  type EdgebandView,
} from "../edgebands";

export function EdgebandFilters(props: {
  rows: CatalogEdgeband[];
  view: EdgebandView;
  onToggle: (name: EdgebandFilterName, value: string) => void;
  onClear: () => void;
}) {
  const groups = edgebandFilterOptions(props.rows, props.view);
  const active = EDGEBAND_FILTER_NAMES.some((name) => (props.view.filters[name] ?? []).length > 0);
  return (
    <Box sx={{ px: 1, pb: 2 }}>
      <Button variant="text" onClick={props.onClear} disabled={!active} fullWidth sx={{ mb: 1, justifyContent: "flex-start" }}>
        Wyczyść filtry
      </Button>
      {groups.map((group) => {
        const selected = props.view.filters[group.name] ?? [];
        return (
          <Accordion key={group.name} disableGutters defaultExpanded={group.open}>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Typography sx={{ flex: 1 }}>{group.label}</Typography>
            </AccordionSummary>
            <AccordionDetails sx={{ pt: 0 }}>
              <FormGroup sx={{ maxHeight: 220, overflow: "auto", flexWrap: "nowrap" }}>
                {group.options.map((option) => (
                  <FormControlLabel
                    key={option.value}
                    sx={{ mr: 0, ml: 0, alignItems: "center", "& .MuiFormControlLabel-label": { flex: 1 } }}
                    control={
                      <Checkbox
                        size="small"
                        checked={selected.includes(option.value)}
                        onChange={() => props.onToggle(group.name, option.value)}
                      />
                    }
                    label={
                      <Box sx={{ display: "flex", gap: 1, alignItems: "baseline" }}>
                        <Typography variant="body2" sx={{ flex: 1 }}>
                          {option.label}
                        </Typography>
                        <Typography variant="body2" sx={{ color: "success.main" }}>
                          {option.count}
                        </Typography>
                      </Box>
                    }
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
