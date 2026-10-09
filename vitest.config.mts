import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  test: {
    environment: "node",
    include: ["**/*.test.ts"],
    exclude: ["node_modules/**", ".next/**"],
    // Testy nigdy nie mogą dotknąć produkcyjnego Blob ani wysłać maila,
    // nawet jeśli w shellu są wyeksportowane zmienne z .env.local.
    env: {
      BLOB_READ_WRITE_TOKEN: "",
      RESEND_API_KEY: "",
    },
  },
});
