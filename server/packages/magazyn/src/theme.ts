import { createTheme } from "@mui/material/styles";

export const theme = createTheme({
  palette: {
    primary: { main: "#0f3d32" },
    secondary: { main: "#8d6a45" },
    background: { default: "#f3f1ec", paper: "#fffcf8" },
    text: { primary: "#1c1917", secondary: "#57534e" },
    divider: "#e7e5e4",
  },
  shape: { borderRadius: 12 },
  typography: {
    fontFamily: 'system-ui, "Segoe UI", sans-serif',
    h6: { fontWeight: 600 },
    subtitle1: { fontWeight: 600 },
  },
  components: {
    MuiAppBar: { styleOverrides: { root: { backgroundImage: "none" } } },
    MuiCard: { styleOverrides: { root: { border: "1px solid #e7e5e4", boxShadow: "none" } } },
    MuiAccordion: {
      styleOverrides: {
        root: { background: "transparent", boxShadow: "none", "&:before": { display: "none" } },
      },
    },
  },
});

export const drawerWidth = 300;
