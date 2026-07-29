import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

import { main, sanitizeHumanText } from '../tools/site-preflight.mjs';

export function buildCliArgs(environment = process.env) {
  const json = (environment.INPUT_JSON ?? 'false').trim().toLowerCase();
  if (json !== 'true' && json !== 'false') {
    throw new Error('Input "json" must be "true" or "false".');
  }

  return [
    ...(json === 'true' ? ['--json'] : []),
    environment.INPUT_URL ?? ''
  ];
}

export async function runAction(
  environment = process.env,
  runMain = main,
  errorStream = process.stderr
) {
  try {
    return await runMain(buildCliArgs(environment));
  } catch (error) {
    errorStream.write(
      `Error [EARGS]: ${sanitizeHumanText(error?.message ?? String(error))}\n`
    );
    return 1;
  }
}

const isDirectRun = process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isDirectRun) {
  process.exitCode = await runAction();
}
