#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const DEFAULT_BASE_CANDIDATES = ['origin/main', 'main'];
const DEFAULT_MAX_PATCH_BYTES = 120_000;
const DEFAULT_CONTEXT = '60';

function parseArgs(argv) {
  const args = {
    json: false,
    maxPatchBytes: DEFAULT_MAX_PATCH_BYTES,
    context: DEFAULT_CONTEXT,
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      args.json = true;
    } else if (arg === '--base') {
      args.base = requireValue(argv, ++index, arg);
    } else if (arg === '--range') {
      args.range = requireValue(argv, ++index, arg);
    } else if (arg === '--max-patch-bytes') {
      args.maxPatchBytes = Number.parseInt(requireValue(argv, ++index, arg), 10);
      if (!Number.isFinite(args.maxPatchBytes) || args.maxPatchBytes < 0) {
        throw new Error('--max-patch-bytes must be a non-negative integer.');
      }
    } else if (arg === '--context') {
      args.context = requireValue(argv, ++index, arg);
      if (!/^\d+$/.test(args.context)) {
        throw new Error('--context must be a non-negative integer.');
      }
    } else if (arg === '--help' || arg === '-h') {
      args.help = true;
    } else {
      throw new Error(`Unknown option: ${arg}`);
    }
  }

  if (args.base && args.range) {
    throw new Error('Use either --base or --range, not both.');
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
  console.log(`Usage: collect-changes.mjs [--json] [--base <ref> | --range <range>]

Collects git change evidence for Smoketest flow updates.

Options:
  --json                    Emit JSON. JSON is emitted by default.
  --base <ref>              Compare merge-base of <ref> and HEAD against HEAD
  --range <range>           Use an explicit git diff range, such as main...HEAD
  --max-patch-bytes <n>     Maximum patch bytes in output (default: ${DEFAULT_MAX_PATCH_BYTES})
  --context <n>             Diff context lines (default: ${DEFAULT_CONTEXT})`);
}

function runGit(args, options = {}) {
  const result = spawnSync('git', args, {
    cwd: options.cwd,
    encoding: options.encoding ?? 'utf8',
    maxBuffer: options.maxBuffer ?? 20 * 1024 * 1024,
  });

  if (result.error) {
    throw new Error(`Could not run git ${args.join(' ')}: ${result.error.message}`);
  }

  if (result.status !== 0) {
    if (options.allowFailure) {
      return null;
    }
    const stderr = typeof result.stderr === 'string' ? result.stderr.trim() : '';
    throw new Error(`git ${args.join(' ')} failed${stderr ? `: ${stderr}` : ''}`);
  }

  return result.stdout;
}

function resolveRepoRoot() {
  const root = runGit(['rev-parse', '--show-toplevel']);
  return root.trim();
}

function resolveCurrentBranch(repoRoot) {
  const branch = runGit(['branch', '--show-current'], { cwd: repoRoot, allowFailure: true });
  if (branch && branch.trim()) {
    return branch.trim();
  }
  const sha = runGit(['rev-parse', '--short', 'HEAD'], { cwd: repoRoot, allowFailure: true });
  return sha?.trim() || 'HEAD';
}

function verifyRef(repoRoot, ref) {
  return runGit(['rev-parse', '--verify', '--quiet', ref], { cwd: repoRoot, allowFailure: true }) !== null;
}

function mergeBase(repoRoot, ref) {
  const output = runGit(['merge-base', 'HEAD', ref], { cwd: repoRoot, allowFailure: true });
  return output?.trim() || null;
}

function resolveComparison(repoRoot, args) {
  if (args.range) {
    return {
      mode: 'range',
      range: args.range,
      base: null,
      baseRef: null,
      source: 'explicit-range',
    };
  }

  if (args.base) {
    const base = mergeBase(repoRoot, args.base) ?? args.base;
    return {
      mode: 'base',
      range: `${base}...HEAD`,
      base,
      baseRef: args.base,
      source: 'explicit-base',
    };
  }

  for (const candidate of DEFAULT_BASE_CANDIDATES) {
    if (!verifyRef(repoRoot, candidate)) {
      continue;
    }
    const base = mergeBase(repoRoot, candidate);
    if (base) {
      return {
        mode: 'base',
        range: `${base}...HEAD`,
        base,
        baseRef: candidate,
        source: 'default',
      };
    }
  }

  if (verifyRef(repoRoot, 'HEAD~1')) {
    return {
      mode: 'base',
      range: 'HEAD~1...HEAD',
      base: 'HEAD~1',
      baseRef: 'HEAD~1',
      source: 'fallback',
    };
  }

  return {
    mode: 'empty',
    range: null,
    base: null,
    baseRef: null,
    source: 'no-history',
  };
}

function collectNameStatus(repoRoot, source, args) {
  const output = runGit(args, { cwd: repoRoot, encoding: 'buffer' });
  return parseNameStatusZ(output, source);
}

function parseNameStatusZ(output, source) {
  const text = Buffer.isBuffer(output) ? output.toString('utf8') : output;
  const parts = text.split('\0').filter(Boolean);
  const changes = [];

  for (let index = 0; index < parts.length;) {
    const rawStatus = parts[index++];
    const status = rawStatus[0];
    if (status === 'R' || status === 'C') {
      const oldPath = parts[index++];
      const filePath = parts[index++];
      changes.push({ source, status, rawStatus, path: filePath, oldPath });
    } else {
      const filePath = parts[index++];
      changes.push({ source, status, rawStatus, path: filePath, oldPath: null });
    }
  }

  return changes;
}

function collectUntracked(repoRoot) {
  const output = runGit(['ls-files', '--others', '--exclude-standard', '-z'], {
    cwd: repoRoot,
    encoding: 'buffer',
  });
  const text = output.toString('utf8');
  return text
    .split('\0')
    .filter(Boolean)
    .map((filePath) => ({
      source: 'untracked',
      status: 'A',
      rawStatus: 'A',
      path: filePath,
      oldPath: null,
    }));
}

function mergeChanges(rawChanges) {
  const byPath = new Map();
  for (const change of rawChanges) {
    const key = change.path;
    const existing = byPath.get(key) ?? {
      path: change.path,
      oldPath: change.oldPath,
      statuses: [],
      sources: [],
      categories: [],
      relevant: true,
      reasons: [],
    };

    if (!existing.statuses.includes(change.rawStatus)) {
      existing.statuses.push(change.rawStatus);
    }
    if (!existing.sources.includes(change.source)) {
      existing.sources.push(change.source);
    }
    if (!existing.oldPath && change.oldPath) {
      existing.oldPath = change.oldPath;
    }

    byPath.set(key, existing);
  }

  return [...byPath.values()].map((change) => {
    const classification = classifyPath(change.path);
    return {
      ...change,
      categories: classification.categories,
      relevant: classification.relevant,
      reasons: classification.reasons,
    };
  }).sort((a, b) => a.path.localeCompare(b.path));
}

function classifyPath(filePath) {
  const normalized = filePath.replace(/\\/g, '/');
  const baseName = path.posix.basename(normalized);
  const categories = [];
  const reasons = [];

  if (isExcluded(normalized, baseName)) {
    return {
      categories: ['excluded'],
      relevant: false,
      reasons: ['Excluded generated, dependency, cache, lockfile, binary, or .smoketest path.'],
    };
  }

  if (/(^|\/)(app|pages|routes|screens)\//.test(normalized) || /route\.[jt]sx?$|page\.[jt]sx?$|layout\.[jt]sx?$/.test(normalized)) {
    categories.push('route');
    reasons.push('Route or page file can change browser journeys.');
  }
  if (/(component|components|ui|navigation|nav|menu|layout)/i.test(normalized)) {
    categories.push('ui');
    reasons.push('UI or navigation file can change user-visible behavior.');
  }
  if (/(auth|login|logout|signup|signin|session|guard|middleware)/i.test(normalized)) {
    categories.push('auth');
    reasons.push('Auth-related file can affect protected journeys.');
  }
  if (/(api|server|action|loader|mutation|query)/i.test(normalized) || /route\.[jt]s$/.test(normalized)) {
    categories.push('api');
    reasons.push('API or server action can affect UI flow outcomes.');
  }
  if (/(test|spec|e2e|playwright|cypress)/i.test(normalized)) {
    categories.push('test');
    reasons.push('Test changes can describe expected user behavior.');
  }
  if (/(fixture|seed|factory|mock)/i.test(normalized)) {
    categories.push('fixture');
    reasons.push('Fixture changes can reveal flow data or states.');
  }
  if (/\.(md|mdx|rst)$/.test(normalized) || /(^|\/)(docs|content|knowledge-base)\//.test(normalized)) {
    categories.push('docs');
    reasons.push('Docs can describe product behavior and success states.');
  }
  if (/package\.json$|config|env|feature-flag/i.test(normalized)) {
    categories.push('config');
    reasons.push('Config can affect enabled routes or integrations.');
  }
  if (/\.(css|scss|sass|less|tailwind\.[cm]?[jt]s)$/.test(normalized)) {
    categories.push('style');
    reasons.push('Style changes are relevant when they affect visible states.');
  }

  if (categories.length === 0) {
    categories.push('other');
    reasons.push('Review for user-flow impact only if surrounding code indicates behavior changed.');
  }

  return { categories, relevant: true, reasons };
}

function isExcluded(normalized, baseName) {
  if (
    normalized.startsWith('.git/') ||
    normalized.startsWith('.smoketest/') ||
    normalized.includes('/node_modules/') ||
    normalized.includes('/.next/') ||
    normalized.includes('/dist/') ||
    normalized.includes('/build/') ||
    normalized.includes('/coverage/') ||
    normalized.includes('/.cache/') ||
    normalized.includes('/.turbo/') ||
    normalized.includes('/generated/') ||
    normalized.includes('/__generated__/')
  ) {
    return true;
  }

  if (
    /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb|Cargo\.lock|Gemfile\.lock|poetry\.lock)$/.test(normalized) ||
    /(^|\/)\.env(\..*)?$/.test(normalized) ||
    /\.(pem|key|p12|pfx)$/i.test(baseName) ||
    /\.generated\./.test(baseName) ||
    /\.(png|jpg|jpeg|gif|webp|avif|ico|pdf|zip|gz|br|mp4|mov|woff2?|ttf|otf)$/i.test(baseName)
  ) {
    return true;
  }

  return false;
}

function collectPatches(repoRoot, comparison, changes, options) {
  const patches = [];
  const bySource = {
    base: relevantFilesForSource(changes, 'base'),
    staged: relevantFilesForSource(changes, 'staged'),
    unstaged: relevantFilesForSource(changes, 'unstaged'),
  };
  let remaining = options.maxPatchBytes;

  if (comparison.range && bySource.base.length > 0 && remaining > 0) {
    const patch = runGit([
      'diff',
      `--unified=${options.context}`,
      '--find-renames',
      '--diff-filter=ACMRT',
      comparison.range,
      '--',
      ...bySource.base,
    ], { cwd: repoRoot });
    patches.push(makePatchEntry('base', `git diff ${comparison.range}`, patch, remaining));
    remaining -= Buffer.byteLength(patches.at(-1).patch, 'utf8');
  }

  if (bySource.staged.length > 0 && remaining > 0) {
    const patch = runGit([
      'diff',
      '--cached',
      `--unified=${options.context}`,
      '--find-renames',
      '--diff-filter=ACMRT',
      '--',
      ...bySource.staged,
    ], { cwd: repoRoot });
    patches.push(makePatchEntry('staged', 'git diff --cached', patch, remaining));
    remaining -= Buffer.byteLength(patches.at(-1).patch, 'utf8');
  }

  if (bySource.unstaged.length > 0 && remaining > 0) {
    const patch = runGit([
      'diff',
      `--unified=${options.context}`,
      '--find-renames',
      '--diff-filter=ACMRT',
      '--',
      ...bySource.unstaged,
    ], { cwd: repoRoot });
    patches.push(makePatchEntry('unstaged', 'git diff', patch, remaining));
    remaining -= Buffer.byteLength(patches.at(-1).patch, 'utf8');
  }

  const untrackedFiles = relevantFilesForSource(changes, 'untracked');
  if (untrackedFiles.length > 0 && remaining > 0) {
    const patch = buildUntrackedPreview(repoRoot, untrackedFiles, remaining);
    patches.push(makePatchEntry('untracked', 'git ls-files --others --exclude-standard', patch, remaining));
  }

  return patches.filter((entry) => entry.patch.length > 0);
}

function relevantFilesForSource(changes, source) {
  return changes
    .filter((change) => change.relevant && change.sources.includes(source) && !change.statuses.some((status) => status.startsWith('D')))
    .map((change) => change.path);
}

function makePatchEntry(source, command, patch, limit) {
  const bytes = Buffer.byteLength(patch, 'utf8');
  if (bytes <= limit) {
    return { source, command, truncated: false, patch };
  }
  return {
    source,
    command,
    truncated: true,
    patch: truncateUtf8(patch, limit),
  };
}

function truncateUtf8(value, maxBytes) {
  if (maxBytes <= 0) {
    return '';
  }
  const buffer = Buffer.from(value, 'utf8');
  return buffer.subarray(0, maxBytes).toString('utf8') + '\n[patch truncated]\n';
}

function buildUntrackedPreview(repoRoot, files, maxBytes) {
  let output = '';
  for (const filePath of files) {
    const absolute = path.join(repoRoot, filePath);
    if (!isLikelyTextFile(filePath, absolute)) {
      continue;
    }
    const content = fs.readFileSync(absolute, 'utf8').split(/\r?\n/).slice(0, 220).map((line) => `+${line}`).join('\n');
    const entry = [
      `diff --git a/${filePath} b/${filePath}`,
      'new file mode 100644',
      '--- /dev/null',
      `+++ b/${filePath}`,
      '@@',
      content,
      '',
    ].join('\n');

    if (Buffer.byteLength(output + entry, 'utf8') > maxBytes) {
      output += '\n[untracked preview truncated]\n';
      break;
    }
    output += entry;
  }
  return output;
}

function isLikelyTextFile(filePath, absolute) {
  if (!fs.existsSync(absolute) || !fs.statSync(absolute).isFile()) {
    return false;
  }
  if (fs.statSync(absolute).size > 250_000) {
    return false;
  }
  const textExtensions = new Set([
    '.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.json', '.md', '.mdx', '.css', '.scss',
    '.html', '.yml', '.yaml', '.toml', '.env', '.txt', '.sql', '.graphql', '.gql',
  ]);
  return textExtensions.has(path.extname(filePath));
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

  try {
    const repoRoot = resolveRepoRoot();
    const comparison = resolveComparison(repoRoot, args);
    const rawChanges = [];

    if (comparison.range) {
      rawChanges.push(...collectNameStatus(repoRoot, 'base', ['diff', '--name-status', '--find-renames', '-z', comparison.range]));
    }
    rawChanges.push(...collectNameStatus(repoRoot, 'staged', ['diff', '--cached', '--name-status', '--find-renames', '-z']));
    rawChanges.push(...collectNameStatus(repoRoot, 'unstaged', ['diff', '--name-status', '--find-renames', '-z']));
    rawChanges.push(...collectUntracked(repoRoot));

    const changes = mergeChanges(rawChanges);
    const result = {
      version: 1,
      generatedAt: new Date().toISOString(),
      repoRoot,
      currentBranch: resolveCurrentBranch(repoRoot),
      comparison,
      totals: {
        changed: changes.length,
        relevant: changes.filter((change) => change.relevant).length,
        excluded: changes.filter((change) => !change.relevant).length,
      },
      changes,
      patches: collectPatches(repoRoot, comparison, changes, {
        maxPatchBytes: args.maxPatchBytes,
        context: args.context,
      }),
    };

    console.log(JSON.stringify(result, null, 2));
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}

main();
