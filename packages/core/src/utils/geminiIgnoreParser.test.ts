/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import * as fs from 'node:fs/promises';
import * as os from 'node:os';
import * as path from 'node:path';
import { FileIgnoreParser } from './geminiIgnoreParser.js';

describe('FileIgnoreParser', () => {
  let testRootDir: string;
  let projectRoot: string;

  async function createTestFile(filePath: string, content = '') {
    const fullPath = path.join(projectRoot, filePath);
    await fs.mkdir(path.dirname(fullPath), { recursive: true });
    await fs.writeFile(fullPath, content);
    return fullPath;
  }

  beforeEach(async () => {
    testRootDir = await fs.mkdtemp(
      path.join(os.tmpdir(), 'file-ignore-parser-test-'),
    );
    projectRoot = path.join(testRootDir, 'project');
    await fs.mkdir(projectRoot, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(testRootDir, { recursive: true, force: true });
  });

  describe('constructor', () => {
    it('should use default .geminiignore when ignoreFileName is not provided', async () => {
      await createTestFile('.geminiignore', '*.log\n/build');
      const parser = new FileIgnoreParser(projectRoot);

      expect(parser.isIgnored('debug.log')).toBe(true);
      expect(parser.isIgnored('build/app.js')).toBe(true);
      expect(parser.isIgnored('src/index.js')).toBe(false);
    });

    it('should use the specified ignoreFileName when provided', async () => {
      const customIgnoreFile = '.my-ignore';
      await createTestFile(customIgnoreFile, 'temp/\ndocs/');
      const parser = new FileIgnoreParser(projectRoot, customIgnoreFile);

      expect(parser.isIgnored('temp/file.tmp')).toBe(true);
      expect(parser.isIgnored('docs/guide.md')).toBe(true);
      expect(parser.isIgnored('src/index.js')).toBe(false);
    });

    it('should not use .geminiignore when a custom ignoreFileName is provided', async () => {
      const customIgnoreFile = '.my-ignore';
      await createTestFile('.geminiignore', '*.log');
      await createTestFile(customIgnoreFile, 'temp/');

      const parser = new FileIgnoreParser(projectRoot, customIgnoreFile);

      // Should respect the custom file
      expect(parser.isIgnored('temp/file.tmp')).toBe(true);

      // Should NOT respect the default .geminiignore file
      expect(parser.isIgnored('debug.log')).toBe(false);
    });
  });
});
