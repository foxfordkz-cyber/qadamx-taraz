import { readFile, writeFile } from "node:fs/promises";
import openapiTS, { astToString } from "openapi-typescript";
import { format } from "prettier";

const source = new URL(
  "../../../packages/contracts/openapi.json",
  import.meta.url,
);
const destination = new URL("../src/shared/api/generated.ts", import.meta.url);
const ast = await openapiTS(source);
const output = await format(
  "// Generated from packages/contracts/openapi.json. Do not edit.\n" +
    astToString(ast),
  { parser: "typescript" },
);
if (process.argv.includes("--check")) {
  let existing = "";
  try {
    existing = await readFile(destination, "utf8");
  } catch {
    /* Missing file is a failed check. */
  }
  if (existing.replace(/\r\n/g, "\n") !== output) {
    process.stderr.write(
      "API types are out of date. Run npm run generate:api.\n",
    );
    process.exitCode = 1;
  } else {
    process.stdout.write("Generated API types match the checked-in OpenAPI.\n");
  }
} else {
  await writeFile(destination, output, "utf8");
  process.stdout.write("Generated src/shared/api/generated.ts.\n");
}
