import fs from 'node:fs'
import path from 'node:path'
import { parse as parseToml } from 'smol-toml'
import { validateHarborToml } from '../utils/harbor-schema'
import type { ValidationIssue, ValidationSeverity } from '../../shared/types'

/**
 * Validates all Harbor task files in a workspace.
 * Checks task.toml with Zod schema, regex checks on instruction.md,
 * Dockerfile, and test.sh, plus cross-file consistency checks.
 */
export class HarborValidationService {
  constructor() {}

  /**
   * Validate all Harbor files in the workspace.
   * Returns an array of validation issues found.
   */
  validate(workspacePath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    // Validate task.toml
    issues.push(...this.validateTaskToml(workspacePath))

    // Validate instruction.md
    issues.push(...this.validateInstructionMd(workspacePath))

    // Validate Dockerfile
    issues.push(...this.validateDockerfile(workspacePath))

    // Validate test.sh
    issues.push(...this.validateTestSh(workspacePath))

    // Validate solve.sh
    issues.push(...this.validateSolveSh(workspacePath))

    // Cross-file consistency checks
    issues.push(...this.validateCrossFile(workspacePath))

    return issues
  }

  private validateTaskToml(workspacePath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const filePath = path.join(workspacePath, 'task.toml')

    if (!fs.existsSync(filePath)) {
      issues.push(this.issue('task.toml', 'error', 'task.toml is missing', 'MISSING_FILE'))
      return issues
    }

    const content = fs.readFileSync(filePath, 'utf-8')

    // Try to parse TOML
    let parsed: Record<string, unknown>
    try {
      parsed = parseToml(content) as Record<string, unknown>
    } catch (err) {
      issues.push(
        this.issue(
          'task.toml',
          'error',
          `Invalid TOML syntax: ${err instanceof Error ? err.message : String(err)}`,
          'TOML_SYNTAX'
        )
      )
      return issues
    }

    // Validate against Zod schema
    const result = validateHarborToml(parsed)
    if (!result.success) {
      for (const error of result.error.errors) {
        issues.push(
          this.issue(
            'task.toml',
            'error',
            `${error.path.join('.')}: ${error.message}`,
            'SCHEMA_VALIDATION'
          )
        )
      }
    }

    // Check for empty description
    const task = parsed.task as Record<string, unknown> | undefined
    if (task) {
      if (!task.description || (task.description as string).trim() === '') {
        issues.push(
          this.issue(
            'task.toml',
            'warning',
            'Task description is empty',
            'EMPTY_DESCRIPTION'
          )
        )
      }

      if (!task.canary_string) {
        issues.push(
          this.issue(
            'task.toml',
            'info',
            'No canary string defined. Consider adding one for anti-cheating detection.',
            'NO_CANARY'
          )
        )
      }
    }

    return issues
  }

  private validateInstructionMd(workspacePath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const filePath = path.join(workspacePath, 'instruction.md')

    if (!fs.existsSync(filePath)) {
      issues.push(
        this.issue('instruction.md', 'error', 'instruction.md is missing', 'MISSING_FILE')
      )
      return issues
    }

    const content = fs.readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')

    // Check for absolute paths (potential information leakage)
    const absolutePathRegex = /(?:\/home\/|\/usr\/|\/tmp\/|\/var\/|\/etc\/|\/opt\/|C:\\|D:\\)/g
    for (let i = 0; i < lines.length; i++) {
      const matches = lines[i].match(absolutePathRegex)
      if (matches) {
        issues.push(
          this.issue(
            'instruction.md',
            'warning',
            `Line ${i + 1}: Contains absolute path "${matches[0]}" which may leak environment info`,
            'ABSOLUTE_PATH',
            i + 1
          )
        )
      }
    }

    // Check for canary string leakage
    const canaryRegex = /CANARY_[A-Z0-9_]+/g
    for (let i = 0; i < lines.length; i++) {
      const matches = lines[i].match(canaryRegex)
      if (matches) {
        issues.push(
          this.issue(
            'instruction.md',
            'error',
            `Line ${i + 1}: Contains canary string "${matches[0]}" which must not appear in instructions`,
            'CANARY_LEAK',
            i + 1
          )
        )
      }
    }

    // Check for minimum content
    if (content.trim().length < 100) {
      issues.push(
        this.issue(
          'instruction.md',
          'warning',
          'Instruction file is very short. Consider adding more detail.',
          'SHORT_INSTRUCTIONS'
        )
      )
    }

    // Check for TODO placeholders
    const todoRegex = /<!--.*-->/g
    const todoCount = (content.match(todoRegex) || []).length
    if (todoCount > 2) {
      issues.push(
        this.issue(
          'instruction.md',
          'warning',
          `Contains ${todoCount} HTML comment placeholders. Fill them in with actual content.`,
          'TODO_PLACEHOLDERS'
        )
      )
    }

    return issues
  }

  private validateDockerfile(workspacePath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const filePath = path.join(workspacePath, 'Dockerfile')

    if (!fs.existsSync(filePath)) {
      issues.push(
        this.issue('Dockerfile', 'error', 'Dockerfile is missing', 'MISSING_FILE')
      )
      return issues
    }

    const content = fs.readFileSync(filePath, 'utf-8')

    // Check for WORKDIR
    if (!/WORKDIR\s+\/app/i.test(content)) {
      issues.push(
        this.issue(
          'Dockerfile',
          'error',
          'Dockerfile must contain "WORKDIR /app"',
          'MISSING_WORKDIR'
        )
      )
    }

    // Check for /logs/verifier/ directory creation
    if (!/\/logs\/verifier/i.test(content)) {
      issues.push(
        this.issue(
          'Dockerfile',
          'error',
          'Dockerfile must create /logs/verifier/ directory (e.g., RUN mkdir -p /logs/verifier)',
          'MISSING_LOGS_DIR'
        )
      )
    }

    // Check for FROM instruction
    if (!/^FROM\s+/im.test(content)) {
      issues.push(
        this.issue(
          'Dockerfile',
          'error',
          'Dockerfile must start with a FROM instruction',
          'MISSING_FROM'
        )
      )
    }

    return issues
  }

  private validateTestSh(workspacePath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const filePath = path.join(workspacePath, 'test.sh')

    if (!fs.existsSync(filePath)) {
      issues.push(
        this.issue('test.sh', 'error', 'test.sh is missing', 'MISSING_FILE')
      )
      return issues
    }

    const content = fs.readFileSync(filePath, 'utf-8')

    // Check for reward.txt output
    if (!/reward\.txt/i.test(content)) {
      issues.push(
        this.issue(
          'test.sh',
          'error',
          'test.sh must write to reward.txt (e.g., /logs/verifier/reward.txt)',
          'MISSING_REWARD_OUTPUT'
        )
      )
    }

    // Check for /logs/verifier/ path
    if (!/\/logs\/verifier\//i.test(content)) {
      issues.push(
        this.issue(
          'test.sh',
          'warning',
          'test.sh should write reward to /logs/verifier/reward.txt',
          'WRONG_REWARD_PATH'
        )
      )
    }

    // Check for shebang
    if (!content.startsWith('#!/')) {
      issues.push(
        this.issue(
          'test.sh',
          'warning',
          'test.sh should start with a shebang line (e.g., #!/usr/bin/env bash)',
          'MISSING_SHEBANG'
        )
      )
    }

    return issues
  }

  private validateSolveSh(workspacePath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []
    const filePath = path.join(workspacePath, 'solve.sh')

    if (!fs.existsSync(filePath)) {
      issues.push(
        this.issue('solve.sh', 'warning', 'solve.sh is missing (reference solution)', 'MISSING_FILE')
      )
      return issues
    }

    const content = fs.readFileSync(filePath, 'utf-8')

    // Check for shebang
    if (!content.startsWith('#!/')) {
      issues.push(
        this.issue(
          'solve.sh',
          'warning',
          'solve.sh should start with a shebang line (e.g., #!/usr/bin/env bash)',
          'MISSING_SHEBANG'
        )
      )
    }

    // Check for TODO placeholder
    if (/TODO.*implement/i.test(content)) {
      issues.push(
        this.issue(
          'solve.sh',
          'warning',
          'solve.sh contains TODO placeholder. Implement the reference solution.',
          'TODO_PLACEHOLDER'
        )
      )
    }

    return issues
  }

  private validateCrossFile(workspacePath: string): ValidationIssue[] {
    const issues: ValidationIssue[] = []

    const taskTomlPath = path.join(workspacePath, 'task.toml')
    const testShPath = path.join(workspacePath, 'test.sh')

    // Cross-check: verifier script path in task.toml matches actual file
    if (fs.existsSync(taskTomlPath)) {
      try {
        const content = fs.readFileSync(taskTomlPath, 'utf-8')
        const parsed = parseToml(content) as Record<string, unknown>
        const verifier = parsed.verifier as Record<string, unknown> | undefined

        if (verifier?.script) {
          const scriptPath = path.join(
            workspacePath,
            verifier.script as string
          )
          if (!fs.existsSync(scriptPath)) {
            issues.push(
              this.issue(
                'task.toml',
                'error',
                `Verifier script "${verifier.script}" referenced in task.toml does not exist`,
                'MISSING_VERIFIER_SCRIPT'
              )
            )
          }
        }
      } catch {
        // TOML parse error already reported
      }
    }

    return issues
  }

  private issue(
    file: string,
    severity: ValidationSeverity,
    message: string,
    code: string,
    line?: number
  ): ValidationIssue {
    return { file, severity, message, code, line }
  }
}
