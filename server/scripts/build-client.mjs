import path from "path";
import { fileURLToPath } from "url";
import { build } from "vite";
import react from "@vitejs/plugin-react";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const clientRoot = path.resolve(__dirname, "../../client");

await build({
  root: clientRoot,
  plugins: [react()],
});
