#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const DEVICES = new Set(['desktop', 'mobile', 'both']);
const SCOPES = new Set(['public', 'authenticated']);
const ACTIONS = new Set(['create', 'update', 'skip']);
const CONFIDENCE = new Set(['high', 'medium', 'low']);

export function validateManifestFile(manifestPath, options = {}) {
  const resolvedPath = path.resolve(manifestPath);
  const manifestDir = path.dirname(resolvedPath);
  const errors = [];
  const warnings = [];
  let manifest = null;

  try {
    manifest = JSON.parse(fs.readFileSync(resolvedPath, 'utf8'));
  } catch (error) {
    errors.push(`Could not read manifest JSON: ${error.message}`);
    return { ok: false, manifest: null, manifestPath: resolvedPath, manifestDir, errors, warnings };
  }

  if (!isObject(manifest)) {
    errors.push('Manifest must be a JSON object.');
    return { ok: false, manifest, manifestPath: resolvedPath, manifestDir, errors, warnings };
  }

  requireNumber(manifest, 'version', errors);
  if (manifest.version !== 1) {
    errors.push('Manifest version must be 1.');
  }

  if (manifest.generatedAt !== undefined && !isValidDateString(manifest.generatedAt)) {
    errors.push('generatedAt must be an ISO-compatible date string when present.');
  }

  if (manifest.baseUrl !== undefined && !isValidUrl(manifest.baseUrl)) {
    errors.push('baseUrl must be a valid URL when present.');
  }

  if (manifest.project !== undefined && !isNonEmptyString(manifest.project)) {
    errors.push('project must be a non-empty string when present.');
  }

  const subflows = manifest.subflows ?? [];
  if (!Array.isArray(subflows)) {
    errors.push('subflows must be an array when present.');
  } else {
    subflows.forEach((subflow, index) => validateSubflow(subflow, index, manifestDir, errors, warnings, options));
  }

  if (!Array.isArray(manifest.candidates)) {
    errors.push('candidates must be an array.');
  } else {
    manifest.candidates.forEach((candidate, index) => validateCandidate(candidate, index, manifestDir, errors, warnings, options));
  }

  if (Array.isArray(manifest.candidates) && manifest.candidates.length === 0 && Array.isArray(subflows) && subflows.length === 0) {
    warnings.push('Manifest has no candidates or subflows.');
  }

  return {
    ok: errors.length === 0,
    manifest,
    manifestPath: resolvedPath,
    manifestDir,
    errors,
    warnings,
  };
}

function validateSubflow(subflow, index, manifestDir, errors, warnings, options) {
  const prefix = `subflows[${index}]`;
  if (!isObject(subflow)) {
    errors.push(`${prefix} must be an object.`);
    return;
  }

  requireString(subflow, 'name', `${prefix}.name`, errors);
  validateRelativeFile(subflow.file, `${prefix}.file`, manifestDir, errors, options);
  validateEnum(subflow.action, ACTIONS, `${prefix}.action`, errors);
  validateEnum(subflow.confidence, CONFIDENCE, `${prefix}.confidence`, errors);
  validateEvidence(subflow.evidence, `${prefix}.evidence`, warnings);
  validateStringArray(subflow.notes, `${prefix}.notes`, errors, { optional: true });
}

function validateCandidate(candidate, index, manifestDir, errors, warnings, options) {
  const prefix = `candidates[${index}]`;
  if (!isObject(candidate)) {
    errors.push(`${prefix} must be an object.`);
    return;
  }

  requireString(candidate, 'name', `${prefix}.name`, errors);
  validateRelativeFile(candidate.file, `${prefix}.file`, manifestDir, errors, options);
  validateUrl(candidate.startUrl, `${prefix}.startUrl`, errors);
  validateEnum(candidate.device, DEVICES, `${prefix}.device`, errors);
  validateEnum(candidate.scope, SCOPES, `${prefix}.scope`, errors);
  validateEnum(candidate.action, ACTIONS, `${prefix}.action`, errors);
  validateEnum(candidate.confidence, CONFIDENCE, `${prefix}.confidence`, errors);
  validateEnvironment(candidate.environment, `${prefix}.environment`, errors);
  validateEvidence(candidate.evidence, `${prefix}.evidence`, warnings);
  validateStringArray(candidate.notes, `${prefix}.notes`, errors, { optional: true });

  if (candidate.scope === 'authenticated' && candidate.action !== 'skip' && !isNonEmptyString(candidate.environment)) {
    warnings.push(`${prefix} is authenticated and has no environment. Applying will fail unless --env is added to the manifest.`);
  }
}

function validateRelativeFile(value, field, manifestDir, errors, options) {
  if (!isNonEmptyString(value)) {
    errors.push(`${field} must be a non-empty relative file path.`);
    return;
  }
  if (path.isAbsolute(value) || value.split(/[\\/]+/).includes('..')) {
    errors.push(`${field} must stay within the manifest directory.`);
    return;
  }
  if (options.checkFiles === false) {
    return;
  }
  const resolved = path.resolve(manifestDir, value);
  if (!fs.existsSync(resolved)) {
    errors.push(`${field} does not exist: ${value}`);
  }
}

function validateEvidence(value, field, warnings) {
  if (value === undefined) {
    warnings.push(`${field} is missing.`);
    return;
  }
  if (!isObject(value)) {
    warnings.push(`${field} should be an object with browser/code arrays.`);
    return;
  }
  const browser = Array.isArray(value.browser) ? value.browser : [];
  const code = Array.isArray(value.code) ? value.code : [];
  if (browser.some((item) => typeof item !== 'string') || code.some((item) => typeof item !== 'string')) {
    warnings.push(`${field}.browser and ${field}.code should contain strings only.`);
  }
  if (browser.length === 0 && code.length === 0) {
    warnings.push(`${field} has no browser or code evidence.`);
  }
}

function validateEnvironment(value, field, errors) {
  if (value === null || value === undefined) {
    return;
  }
  if (!isNonEmptyString(value)) {
    errors.push(`${field} must be null or a non-empty string.`);
  }
}

function validateStringArray(value, field, errors, options = {}) {
  if (value === undefined && options.optional) {
    return;
  }
  if (!Array.isArray(value)) {
    errors.push(`${field} must be an array.`);
    return;
  }
  if (value.some((item) => typeof item !== 'string')) {
    errors.push(`${field} must contain only strings.`);
  }
}

function validateEnum(value, allowed, field, errors) {
  if (!allowed.has(value)) {
    errors.push(`${field} must be one of: ${[...allowed].join(', ')}.`);
  }
}

function validateUrl(value, field, errors) {
  if (!isValidUrl(value)) {
    errors.push(`${field} must be a valid URL.`);
  }
}

function requireNumber(object, key, errors) {
  if (typeof object[key] !== 'number') {
    errors.push(`${key} must be a number.`);
  }
}

function requireString(object, key, field, errors) {
  if (!isNonEmptyString(object[key])) {
    errors.push(`${field} must be a non-empty string.`);
  }
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isValidDateString(value) {
  return isNonEmptyString(value) && !Number.isNaN(Date.parse(value));
}

function isValidUrl(value) {
  if (!isNonEmptyString(value)) {
    return false;
  }
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const args = { json: false, manifestPath: '.smoketest/changes/manifest.json' };
  const positional = [];
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--json') {
      args.json = true;
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

function printUsage() {
  console.log(`Usage: validate-manifest.mjs [manifest.json] [--json]

Validates a Smoketest Changes manifest. Defaults to .smoketest/changes/manifest.json.`);
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

  const result = validateManifestFile(args.manifestPath);
  if (args.json) {
    console.log(JSON.stringify(result, null, 2));
  } else {
    for (const warning of result.warnings) {
      console.warn(`warning: ${warning}`);
    }
    for (const error of result.errors) {
      console.error(`error: ${error}`);
    }
    console.log(result.ok ? 'Manifest is valid.' : 'Manifest is invalid.');
  }
  process.exit(result.ok ? 0 : 1);
}

if (import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
