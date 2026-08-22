import fs from "node:fs/promises";
import path from "node:path";
import process from "node:process";

const inputPath = process.argv[2] ?? "/Users/sathishguptha/Downloads/kural_website_clean_final.sql";
const outputPath = process.argv[3] ?? "/private/tmp/kural-companion-hostinger.sql";
const source = await fs.readFile(inputPath, "utf8");

const revisionTable = `
CREATE TABLE IF NOT EXISTS kural_revisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kural_number INT NOT NULL,
  snapshot LONGTEXT NOT NULL,
  changed_by VARCHAR(120) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_kural_revisions_number (kural_number),
  KEY idx_kural_revisions_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
`;

if (!source.includes("CREATE TABLE `kural_website`")) {
  throw new Error("The supplied SQL does not contain the expected kural_website table.");
}

let output = source.replace(
  "START TRANSACTION;",
  "START TRANSACTION;\n\nDROP TABLE IF EXISTS `kural_revisions`;",
);

const marker = "SET FOREIGN_KEY_CHECKS = 1;";
if (!output.includes(marker)) {
  throw new Error("The supplied SQL does not contain the expected import footer.");
}

output = output.replace(marker, `${revisionTable}\n${marker}`);
await fs.mkdir(path.dirname(outputPath), { recursive: true });
await fs.writeFile(outputPath, output, "utf8");

const kuralRows = (output.match(/^\([0-9]+,'[0-9]{4}'/gm) ?? []).length;
console.log(`Wrote ${kuralRows} Kural rows and revision table to ${outputPath}`);
