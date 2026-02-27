/**
 * Stub for node-pty terminal management.
 * Placeholder methods until node-pty native compilation is set up.
 *
 * node-pty requires native compilation and platform-specific setup,
 * so this service provides the interface without the implementation.
 */

interface TerminalInstance {
  id: string
  workspaceId: string
  cols: number
  rows: number
}

export class TerminalService {
  private terminals: Map<string, TerminalInstance> = new Map()

  constructor() {}

  /**
   * Create a new terminal instance for a workspace.
   * Stub: returns a terminal ID but does not spawn a real PTY.
   */
  createTerminal(workspaceId: string): string {
    const terminalId = `term-${workspaceId}-${Date.now()}`

    this.terminals.set(terminalId, {
      id: terminalId,
      workspaceId,
      cols: 80,
      rows: 24
    })

    console.warn(
      `[TerminalService] Stub: createTerminal called for workspace ${workspaceId}. ` +
        'node-pty is not yet configured.'
    )

    return terminalId
  }

  /**
   * Write data to a terminal.
   * Stub: logs the data but does not send to a real PTY.
   */
  write(workspaceId: string, data: string): void {
    console.warn(
      `[TerminalService] Stub: write called for workspace ${workspaceId} ` +
        `with ${data.length} bytes. node-pty is not yet configured.`
    )
  }

  /**
   * Resize a terminal.
   * Stub: updates stored dimensions but does not resize a real PTY.
   */
  resize(workspaceId: string, cols: number, rows: number): void {
    // Find terminal by workspaceId
    for (const [_id, terminal] of this.terminals) {
      if (terminal.workspaceId === workspaceId) {
        terminal.cols = cols
        terminal.rows = rows
        break
      }
    }

    console.warn(
      `[TerminalService] Stub: resize called for workspace ${workspaceId} ` +
        `to ${cols}x${rows}. node-pty is not yet configured.`
    )
  }

  /**
   * Destroy a terminal instance.
   * Stub: removes from the map but does not kill a real PTY.
   */
  destroy(workspaceId: string): void {
    // Remove all terminals for this workspace
    for (const [id, terminal] of this.terminals) {
      if (terminal.workspaceId === workspaceId) {
        this.terminals.delete(id)
      }
    }

    console.warn(
      `[TerminalService] Stub: destroy called for workspace ${workspaceId}. ` +
        'node-pty is not yet configured.'
    )
  }

  /**
   * Check if a terminal exists for the given workspace.
   */
  hasTerminal(workspaceId: string): boolean {
    for (const [_id, terminal] of this.terminals) {
      if (terminal.workspaceId === workspaceId) {
        return true
      }
    }
    return false
  }
}
