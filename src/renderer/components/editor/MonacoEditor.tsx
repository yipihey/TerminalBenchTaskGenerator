import Editor from '@monaco-editor/react'

interface MonacoEditorProps {
  filePath: string
  content: string
  language: string
  onChange?: (value: string) => void
  readOnly?: boolean
}

export function MonacoEditor({
  filePath,
  content,
  language,
  onChange,
  readOnly = false,
}: MonacoEditorProps) {
  const handleChange = (value: string | undefined) => {
    if (value !== undefined && onChange) {
      onChange(value)
    }
  }

  return (
    <div className="h-full w-full">
      <Editor
        path={filePath}
        value={content}
        language={language}
        theme="vs-dark"
        onChange={handleChange}
        options={{
          readOnly,
          minimap: { enabled: false },
          lineNumbers: 'on',
          wordWrap: language === 'markdown' ? 'on' : 'off',
          fontSize: 13,
          scrollBeyondLastLine: false,
          automaticLayout: true,
          padding: { top: 12 },
          tabSize: 2,
          renderWhitespace: 'selection',
          bracketPairColorization: { enabled: true },
          smoothScrolling: true,
        }}
      />
    </div>
  )
}
