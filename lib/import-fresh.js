import fs from "node:fs";
import path from "node:path";

export async function importFresh(modulePath) {
  const filepath = path.resolve(modulePath);
  const fileContent = await fs.promises.readFile(filepath, "utf8");
  const ext = path.extname(filepath);
  const extRegex = new RegExp(`\\${ext}$`);
  const newFilepath = `${filepath.replace(extRegex, "")}${Date.now()}${ext}`;
  await fs.promises.writeFile(newFilepath, fileContent);
  const module = await import(newFilepath);
  fs.unlink(newFilepath, () => {});
  return module;
}
