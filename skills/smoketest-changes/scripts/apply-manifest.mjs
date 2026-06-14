#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { validateManifestFile } from './validate-manifest.mjs';

function parseArgs(argv) {
  const args = {
    manifestPath: '.smoketest/changes/manifest.json',
    apply: false,
    smoketestBin: 'smoketest',
    passthrough: [],
  };
  const positional = [];

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') {
      args.apply = true;
    } else if (arg === '--project') {
      args.project = requireValue(argv, ++index, arg);
    } else if (arg === '--smoketest-bin') {
      args.smoketestBin = requireValue(argv, ++index, arg);
    } else if (arg === '--profile') {
      args.passthrough.push('--profile', requireValue(argv, ++index, arg));
    } else if (arg === '--api-url') {
      args.passthrough.push('--api-url', requireValue(argv, ++index, arg));
    } else if (arg === '--allow-insecure-api-url') {
      args.passthrough.push('--allow-insecure-api-url');
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length > 1) {
    throw new Error('Pass at most one manifest path.');
  }
  if (positional[0]) {
    args.manifestPath = positional[0];
  }
  return args;
}

function requireValue(argv, index, option) {
  const value = argv[index];
  if (!value || value.startsWith('--')) {
    throw new Error(`${option} requires a value.`);
  }
  return value;
}

function printUsage() {
  console.log(`Usage: apply-manifest.mjs [manifest.json] [options]

Defaults to dry-run. Add --apply to create/update Smoketest resources.

Options:
  --apply                     Execute Smoketest CLI create/update commands
  --project <project>         Project ID, short ID, or exact name
  --smoketest-bin <bin>       Smoketest CLI binary (default: smoketest)
  --profile <profile>         Pass through Smoketest CLI profile
  --api-url <url>             Pass through Smoketest API URL
  --allow-insecure-api-url    Pass through Smoketest insecure API flag`);
}

function runCli(args, options) {
  const command = [options.smoketestBin, ...args, ...options.passthrough];
  if (!options.apply) {
    console.log(`[dry-run] ${shellQuote(command)}`);
    return { stdout: '', json: null };
  }

  const result = spawnSync(options.smoketestBin, [...args, ...options.passthrough], {
    encoding: 'utf8',
    stdio: ['inherit', 'pipe', 'pipe'],
  });

  if (result.error) {
    throw new Error(`Could not run ${options.smoketestBin}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    if (result.stdout) process.stdout.write(result.stdout);
    if (result.stderr) process.stderr.write(result.stderr);
    throw new Error(`Command failed: ${shellQuote(command)}`);
  }

  const stdout = result.stdout.trim();
  const json = stdout ? parseJson(stdout, command) : null;
  return { stdout, json };
}

function parseJson(stdout, command) {
  try {
    return JSON.parse(stdout);
  } catch {
    throw new Error(`Expected JSON from command: ${shellQuote(command)}\nOutput:\n${stdout}`);
  }
}

function shellQuote(parts) {
  return parts.map((part) => {
    if (/^[A-Za-z0-9_./:=@-]+$/.test(part)) {
      return part;
    }
    return `'${part.replace(/'/g, "'\\''")}'`;
  }).join(' ');
}

function loadDescription(manifestDir, relativeFile) {
  return fs.readFileSync(path.resolve(manifestDir, relativeFile), 'utf8');
}

function writeTempDescription(content) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'smoketest-changes-'));
  const file = path.join(dir, 'description.md');
  fs.writeFileSync(file, content);
  return { dir, file };
}

function replaceSubflowPlaceholders(content, subflowIdsByName) {
  return content.replace(/\{\{smoketest-subflow:([^}]+)\}\}/g, (_match, rawName) => {
    const name = rawName.trim();
    const id = subflowIdsByName.get(name);
    if (!id) {
      throw new Error(`No subflow ID available for placeholder: ${name}`);
    }
    return `[${name}](smoketest-subflow:${id})`;
  });
}

function findByName(items, name) {
  return items.find((item) => item.name === name) ?? null;
}

function summarize(item, operation, reason = '') {
  return {
    name: item.name,
    operation,
    reason,
  };
}

function main() {
  let args;
  try {
    args = parseArgs(process.argv.slice(2));
  } catch (error) {
    console.error(error.message);
    printUsage();
    process.exit(2);
  }

  if (args.help) {
    printUsage();
    return;
  }

  const validation = validateManifestFile(args.manifestPath);
  for (const warning of validation.warnings) {
    console.warn(`warning: ${warning}`);
  }
  if (!validation.ok) {
    for (const error of validation.errors) {
      console.error(`error: ${error}`);
    }
    process.exit(1);
  }

  const manifest = validation.manifest;
  const project = args.project ?? manifest.project;
  if (!project || typeof project !== 'string') {
    console.error('Project is required. Pass --project or set manifest.project.');
    process.exit(1);
  }

  const options = {
    apply: args.apply,
    smoketestBin: args.smoketestBin,
    passthrough: args.passthrough,
  };
  const summary = {
    mode: args.apply ? 'apply' : 'dry-run',
    project,
    subflows: [],
    flows: [],
  };

  try {
    let existingSubflows = [];
    let existingFlows = [];

    if (args.apply) {
      runCli(['auth', 'whoami', '--json'], options);
      existingSubflows = runCli(['subflows', 'list', '--project', project, '--json'], options).json ?? [];
      existingFlows = runCli(['flows', 'list', '--project', project, '--json'], options).json ?? [];
    }

    const subflowIdsByName = new Map();
    for (const existing of existingSubflows) {
      subflowIdsByName.set(existing.name, existing.id);
    }

    for (const subflow of manifest.subflows ?? []) {
      if (subflow.action === 'skip') {
        summary.subflows.push(summarize(subflow, 'skip', 'manifest action is skip'));
        continue;
      }

      const existing = findByName(existingSubflows, subflow.name);
      const descriptionArg = `@${path.resolve(validation.manifestDir, subflow.file)}`;
      if (existing) {
        runCli(['subflows', 'edit', existing.id, '--project', project, '--description', descriptionArg, '--json'], options);
        subflowIdsByName.set(subflow.name, existing.id);
        summary.subflows.push(summarize(subflow, args.apply ? 'updated' : 'would-upsert', existing.id));
      } else {
        const result = runCli(['subflows', 'create', '--project', project, '--name', subflow.name, '--description', descriptionArg, '--json'], options);
        if (result.json?.id) {
          subflowIdsByName.set(subflow.name, result.json.id);
        } else if (!args.apply) {
          subflowIdsByName.set(subflow.name, `dry-run-${slugify(subflow.name)}`);
        }
        summary.subflows.push(summarize(subflow, args.apply ? 'created' : 'would-create'));
      }
    }

    for (const candidate of manifest.candidates ?? []) {
      if (candidate.action === 'skip') {
        summary.flows.push(summarize(candidate, 'skip', 'manifest action is skip'));
        continue;
      }

      if (candidate.scope === 'authenticated' && !candidate.environment) {
        throw new Error(`Authenticated flow "${candidate.name}" requires an environment.`);
      }

      const existing = findByName(existingFlows, candidate.name);
      const rawDescription = loadDescription(validation.manifestDir, candidate.file);
      const finalDescription = replaceSubflowPlaceholders(rawDescription, subflowIdsByName);
      const temp = finalDescription === rawDescription || !args.apply
        ? null
        : writeTempDescription(finalDescription);
      const descriptionArg = temp
        ? `@${temp.file}`
        : `@${path.resolve(validation.manifestDir, candidate.file)}`;

      try {
        if (existing) {
          const cliArgs = [
            'flows', 'edit', existing.id,
            '--project', project,
            '--url', candidate.startUrl,
            '--description', descriptionArg,
            '--device', candidate.device,
            '--json',
          ];
          if (candidate.environment) {
            cliArgs.push('--env', candidate.environment);
          }
          runCli(cliArgs, options);
          summary.flows.push(summarize(candidate, args.apply ? 'updated' : 'would-upsert', existing.id));
        } else {
          const cliArgs = [
            'flows', 'create',
            '--project', project,
            '--name', candidate.name,
            '--url', candidate.startUrl,
            '--description', descriptionArg,
            '--device', candidate.device,
            '--json',
          ];
          if (candidate.environment) {
            cliArgs.push('--env', candidate.environment);
          }
          runCli(cliArgs, options);
          summary.flows.push(summarize(candidate, args.apply ? 'created' : 'would-create'));
        }
      } finally {
        if (temp) {
          fs.rmSync(temp.dir, { recursive: true, force: true });
        }
      }
    }

    console.log(JSON.stringify(summary, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

function slugify(value) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'subflow';
}

main();
