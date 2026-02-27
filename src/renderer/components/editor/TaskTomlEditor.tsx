import { useCallback, useMemo } from 'react'
import { parse, stringify } from 'smol-toml'
import { useEditorStore } from '../../stores/editorStore'
import type { HarborTaskToml } from '../../../shared/types'
import { MonacoEditor } from './MonacoEditor'

interface TaskTomlEditorProps {
  content: string
  onChange: (content: string) => void
}

const DOMAINS = ['life-sciences', 'physical-sciences', 'earth-sciences'] as const
const DIFFICULTIES = ['easy', 'medium', 'hard', 'expert'] as const

/** Safely parse the TOML content into a HarborTaskToml-shaped object. */
function parseTaskToml(content: string): HarborTaskToml | null {
  try {
    const parsed = parse(content) as unknown as HarborTaskToml
    return parsed
  } catch {
    return null
  }
}

/** Generate a random canary string (hex). */
function generateCanary(): string {
  const bytes = new Uint8Array(16)
  crypto.getRandomValues(bytes)
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

// ── Reusable form primitives ──

function FieldLabel({ label, htmlFor }: { label: string; htmlFor?: string }) {
  return (
    <label htmlFor={htmlFor} className="block text-xs font-medium text-zinc-400 mb-1">
      {label}
    </label>
  )
}

function TextInput({
  id,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  id?: string
  value: string | number
  onChange: (value: string) => void
  placeholder?: string
  type?: 'text' | 'number'
}) {
  return (
    <input
      id={id}
      type={type}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    />
  )
}

function TextAreaInput({
  id,
  value,
  onChange,
  rows = 3,
  placeholder,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  rows?: number
  placeholder?: string
}) {
  return (
    <textarea
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      rows={rows}
      placeholder={placeholder}
      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-y"
    />
  )
}

function SelectInput({
  id,
  value,
  onChange,
  options,
}: {
  id?: string
  value: string
  onChange: (value: string) => void
  options: readonly string[]
}) {
  return (
    <select
      id={id}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-md border border-zinc-700 bg-zinc-800 px-3 py-1.5 text-sm text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
    >
      {options.map((opt) => (
        <option key={opt} value={opt}>
          {opt}
        </option>
      ))}
    </select>
  )
}

function CheckboxInput({
  id,
  checked,
  onChange,
  label,
}: {
  id?: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
}) {
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-sm text-zinc-300 cursor-pointer">
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-zinc-700 bg-zinc-800 text-indigo-600 focus:ring-indigo-500 focus:ring-offset-zinc-900"
      />
      {label}
    </label>
  )
}

function SectionHeader({ title }: { title: string }) {
  return (
    <h4 className="text-sm font-semibold text-zinc-200 border-b border-zinc-700 pb-2 mb-4">
      {title}
    </h4>
  )
}

// ── Form Mode ──

function TaskTomlForm({ content, onChange }: TaskTomlEditorProps) {
  const data = useMemo(() => parseTaskToml(content), [content])

  const update = useCallback(
    (mutator: (draft: HarborTaskToml) => void) => {
      const current = parseTaskToml(content)
      if (!current) return

      mutator(current)

      try {
        const serialized = stringify(current as unknown as Record<string, unknown>)
        onChange(serialized)
      } catch {
        // If stringify fails, silently ignore (form is in a partial state)
      }
    },
    [content, onChange],
  )

  if (!data) {
    return (
      <div className="flex items-center justify-center h-full p-8">
        <div className="text-center">
          <p className="text-sm text-red-400 mb-2">Failed to parse task.toml</p>
          <p className="text-xs text-zinc-500">
            Switch to Raw TOML mode to fix syntax errors.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto p-4 space-y-6">
      {/* ── Task Section ── */}
      <section>
        <SectionHeader title="Task" />
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FieldLabel label="Name" htmlFor="task-name" />
            <TextInput
              id="task-name"
              value={data.task.name}
              onChange={(v) => update((d) => { d.task.name = v })}
              placeholder="e.g. protein-folding-analysis"
            />
          </div>

          <div className="col-span-2">
            <FieldLabel label="Description" htmlFor="task-desc" />
            <TextAreaInput
              id="task-desc"
              value={data.task.description}
              onChange={(v) => update((d) => { d.task.description = v })}
              placeholder="Describe what the agent must accomplish..."
              rows={3}
            />
          </div>

          <div>
            <FieldLabel label="Domain" htmlFor="task-domain" />
            <SelectInput
              id="task-domain"
              value={data.task.domain}
              onChange={(v) => update((d) => { d.task.domain = v as HarborTaskToml['task']['domain'] })}
              options={DOMAINS}
            />
          </div>

          <div>
            <FieldLabel label="Field" htmlFor="task-field" />
            <TextInput
              id="task-field"
              value={data.task.field}
              onChange={(v) => update((d) => { d.task.field = v })}
              placeholder="e.g. bioinformatics"
            />
          </div>

          <div>
            <FieldLabel label="Subfield" htmlFor="task-subfield" />
            <TextInput
              id="task-subfield"
              value={data.task.subfield ?? ''}
              onChange={(v) => update((d) => { d.task.subfield = v || undefined })}
              placeholder="e.g. protein-structure"
            />
          </div>

          <div>
            <FieldLabel label="Difficulty" htmlFor="task-difficulty" />
            <SelectInput
              id="task-difficulty"
              value={data.task.difficulty}
              onChange={(v) => update((d) => { d.task.difficulty = v as HarborTaskToml['task']['difficulty'] })}
              options={DIFFICULTIES}
            />
          </div>

          <div className="col-span-2">
            <FieldLabel label="Tags (comma-separated)" htmlFor="task-tags" />
            <TextInput
              id="task-tags"
              value={(data.task.tags ?? []).join(', ')}
              onChange={(v) =>
                update((d) => {
                  d.task.tags = v
                    .split(',')
                    .map((t) => t.trim())
                    .filter(Boolean)
                })
              }
              placeholder="python, biology, genomics"
            />
          </div>

          <div className="col-span-2">
            <FieldLabel label="Canary String" htmlFor="task-canary" />
            <div className="flex gap-2">
              <div className="flex-1">
                <TextInput
                  id="task-canary"
                  value={data.task.canary_string ?? ''}
                  onChange={(v) => update((d) => { d.task.canary_string = v || undefined })}
                  placeholder="Auto-generated unique identifier"
                />
              </div>
              <button
                type="button"
                onClick={() => update((d) => { d.task.canary_string = generateCanary() })}
                className="shrink-0 rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500 transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                Generate
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── Environment Section ── */}
      <section>
        <SectionHeader title="Environment" />
        <div className="grid grid-cols-2 gap-4">
          <div className="col-span-2">
            <FieldLabel label="Base Image" htmlFor="env-image" />
            <TextInput
              id="env-image"
              value={data.environment.base_image ?? 'python:3.11-slim'}
              onChange={(v) => update((d) => { d.environment.base_image = v })}
              placeholder="python:3.11-slim"
            />
          </div>

          <div>
            <FieldLabel label="Timeout (seconds)" htmlFor="env-timeout" />
            <TextInput
              id="env-timeout"
              type="number"
              value={data.environment.timeout_seconds}
              onChange={(v) => update((d) => { d.environment.timeout_seconds = Number(v) || 0 })}
            />
          </div>

          <div>
            <FieldLabel label="Memory Limit (MB)" htmlFor="env-memory" />
            <TextInput
              id="env-memory"
              type="number"
              value={data.environment.memory_limit_mb ?? ''}
              onChange={(v) => update((d) => { d.environment.memory_limit_mb = v ? Number(v) : undefined })}
            />
          </div>

          <div>
            <FieldLabel label="CPU Limit" htmlFor="env-cpu" />
            <TextInput
              id="env-cpu"
              type="number"
              value={data.environment.cpu_limit ?? ''}
              onChange={(v) => update((d) => { d.environment.cpu_limit = v ? Number(v) : undefined })}
            />
          </div>

          <div className="flex items-end">
            <CheckboxInput
              id="env-gpu"
              checked={data.environment.gpu ?? false}
              onChange={(v) => update((d) => { d.environment.gpu = v })}
              label="GPU Required"
            />
          </div>
        </div>
      </section>

      {/* ── Agent Section ── */}
      <section>
        <SectionHeader title="Agent" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel label="Model" htmlFor="agent-model" />
            <TextInput
              id="agent-model"
              value={data.agent.model ?? ''}
              onChange={(v) => update((d) => { d.agent.model = v || undefined })}
              placeholder="e.g. claude-sonnet-4-20250514"
            />
          </div>

          <div>
            <FieldLabel label="Max Tokens" htmlFor="agent-tokens" />
            <TextInput
              id="agent-tokens"
              type="number"
              value={data.agent.max_tokens ?? ''}
              onChange={(v) => update((d) => { d.agent.max_tokens = v ? Number(v) : undefined })}
            />
          </div>

          <div>
            <FieldLabel label="Timeout (seconds)" htmlFor="agent-timeout" />
            <TextInput
              id="agent-timeout"
              type="number"
              value={data.agent.timeout_seconds}
              onChange={(v) => update((d) => { d.agent.timeout_seconds = Number(v) || 0 })}
            />
          </div>
        </div>
      </section>

      {/* ── Verifier Section ── */}
      <section>
        <SectionHeader title="Verifier" />
        <div className="grid grid-cols-2 gap-4">
          <div>
            <FieldLabel label="Type" htmlFor="verifier-type" />
            <TextInput
              id="verifier-type"
              value={data.verifier.type}
              onChange={(v) => update((d) => { d.verifier.type = v as 'script' })}
              placeholder="script"
            />
          </div>

          <div>
            <FieldLabel label="Script" htmlFor="verifier-script" />
            <TextInput
              id="verifier-script"
              value={data.verifier.script}
              onChange={(v) => update((d) => { d.verifier.script = v })}
              placeholder="tests/test.sh"
            />
          </div>
        </div>
      </section>
    </div>
  )
}

// ── Main Component ──

export function TaskTomlEditor({ content, onChange }: TaskTomlEditorProps) {
  const viewMode = useEditorStore((s) => s.taskTomlViewMode)
  const setViewMode = useEditorStore((s) => s.setTaskTomlViewMode)

  return (
    <div className="flex flex-col h-full">
      {/* Header with toggle */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-zinc-800 bg-zinc-900 shrink-0">
        <span className="text-xs font-medium text-zinc-400">task.toml</span>
        <div className="flex items-center rounded-md bg-zinc-800 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode('form')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'form'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Form
          </button>
          <button
            type="button"
            onClick={() => setViewMode('raw')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              viewMode === 'raw'
                ? 'bg-indigo-600 text-white'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Raw TOML
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 min-h-0">
        {viewMode === 'form' ? (
          <TaskTomlForm content={content} onChange={onChange} />
        ) : (
          <MonacoEditor
            filePath="task.toml"
            content={content}
            language="toml"
            onChange={onChange}
          />
        )}
      </div>
    </div>
  )
}
