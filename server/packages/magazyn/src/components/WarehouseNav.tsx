import Button from "@mui/material/Button";
import { Link as RouterLink } from "react-router-dom";

export function WarehouseNav() {
  return (
    <>
      <Button component={RouterLink} to="/" color="inherit">
        Płyty
      </Button>
      <Button component={RouterLink} to="/obrzeza" color="inherit">
        Obrzeża
      </Button>
    </>
  );
}
