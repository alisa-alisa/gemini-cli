/**
 * @license
 * Copyright 2025 Google LLC
 * SPDX-License-Identifier: Apache-2.0
 */

import type { GitIgnoreFilter } from '../utils/gitIgnoreParser.js';
import type { FileIgnoreFilter } from '../utils/geminiIgnoreParser.js';
import { GitIgnoreParser } from '../utils/gitIgnoreParser.js';
import { FileIgnoreParser } from '../utils/geminiIgnoreParser.js';
import { isGitRepository } from '../utils/gitUtils.js';
import * as path from 'node:path';

export interface FilterFilesOptions {
  respectGitIgnore?: boolean;
  respectGeminiIgnore?: boolean;
}

export interface FileDiscoveryServiceOptions {
  projectRoot: string;
  ignoreFileName?: string;
}

export interface FilterReport {
  filteredPaths: string[];
  ignoredCount: number;
}

export class FileDiscoveryService {
  private gitIgnoreFilter: GitIgnoreFilter | null = null;
  private geminiIgnoreFilter: FileIgnoreFilter | null = null;
  private customIgnoreFilter: FileIgnoreFilter | null = null;
  private combinedIgnoreFilter: GitIgnoreFilter | null = null;
  private projectRoot: string;

  constructor(options: FileDiscoveryServiceOptions) {
    const { projectRoot, ignoreFileName } = options;
    this.projectRoot = path.resolve(projectRoot);
    if (isGitRepository(this.projectRoot)) {
      this.gitIgnoreFilter = new GitIgnoreParser(this.projectRoot);
    }
    this.geminiIgnoreFilter = new FileIgnoreParser(this.projectRoot);
    if (ignoreFileName) {
      this.customIgnoreFilter = new FileIgnoreParser(
        this.projectRoot,
        ignoreFileName,
      );
    }

    if (this.gitIgnoreFilter) {
      const additionalPatterns = [
        ...this.geminiIgnoreFilter.getPatterns(),
        ...(this.customIgnoreFilter?.getPatterns() ?? []),
      ];
      // Create combined parser: .gitignore + .geminiignore + custom ignore
      this.combinedIgnoreFilter = new GitIgnoreParser(
        this.projectRoot,
        additionalPatterns,
      );
    }
  }

  /**
   * Filters a list of file paths based on git ignore rules
   */
  filterFiles(filePaths: string[], options: FilterFilesOptions = {}): string[] {
    const { respectGitIgnore = true, respectGeminiIgnore = true } = options;
    return filePaths.filter((filePath) => {
      if (
        respectGitIgnore &&
        respectGeminiIgnore &&
        this.combinedIgnoreFilter
      ) {
        // we always respect custom ignore that's why no additional flag here
        return !this.combinedIgnoreFilter.isIgnored(filePath);
      }

      if (respectGitIgnore && this.gitIgnoreFilter?.isIgnored(filePath)) {
        return false;
      }
      if (respectGeminiIgnore && this.geminiIgnoreFilter?.isIgnored(filePath)) {
        return false;
      }
      if (this.customIgnoreFilter?.isIgnored(filePath)) {
        return false;
      }
      return true;
    });
  }

  /**
   * Filters a list of file paths based on git ignore rules and returns a report
   * with counts of ignored files.
   */
  filterFilesWithReport(
    filePaths: string[],
    opts: FilterFilesOptions = {
      respectGitIgnore: true,
      respectGeminiIgnore: true,
    },
  ): FilterReport {
    const filteredPaths = this.filterFiles(filePaths, opts);
    const ignoredCount = filePaths.length - filteredPaths.length;

    return {
      filteredPaths,
      ignoredCount,
    };
  }

  /**
   * Unified method to check if a file should be ignored based on filtering options
   */
  shouldIgnoreFile(
    filePath: string,
    options: FilterFilesOptions = {},
  ): boolean {
    return this.filterFiles([filePath], options).length === 0;
  }
}
