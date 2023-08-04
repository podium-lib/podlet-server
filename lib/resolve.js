import { readFile } from 'node:fs/promises';
import { join, parse } from 'node:path';

export default async function resolve(filePath) {
  const meta = parse(filePath);
  const tsSrcPath = `${join(meta.dir, meta.name)}.ts`;
  try {
    // try to read typescript version first
    await readFile(tsSrcPath, { encoding: 'utf8' });
    return tsSrcPath;
  } catch (err) {
    // if error was not due to file not existing, log.
    if (err.errno !== -2) {
      // eslint-disable-next-line
      console.log(err);
    }
    // assume no ts, since reading it failed
    return filePath;
  }
}
