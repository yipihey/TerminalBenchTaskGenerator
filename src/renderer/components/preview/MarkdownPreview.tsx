import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'

interface MarkdownPreviewProps {
  content: string
}

const components: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-zinc-100 mt-6 mb-4 pb-2 border-b border-zinc-700">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-zinc-100 mt-5 mb-3 pb-1.5 border-b border-zinc-800">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-zinc-200 mt-4 mb-2">{children}</h3>
  ),
  h4: ({ children }) => (
    <h4 className="text-base font-semibold text-zinc-200 mt-3 mb-1.5">{children}</h4>
  ),
  p: ({ children }) => <p className="text-sm text-zinc-300 leading-relaxed mb-3">{children}</p>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  ul: ({ children }) => <ul className="list-disc list-outside ml-5 mb-3 space-y-1">{children}</ul>,
  ol: ({ children }) => (
    <ol className="list-decimal list-outside ml-5 mb-3 space-y-1">{children}</ol>
  ),
  li: ({ children }) => <li className="text-sm text-zinc-300 leading-relaxed">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-indigo-500 pl-4 my-3 text-zinc-400 italic">
      {children}
    </blockquote>
  ),
  code: ({ className, children }) => {
    const isInline = !className
    if (isInline) {
      return (
        <code className="rounded bg-zinc-800 px-1.5 py-0.5 font-mono text-[0.85em] text-indigo-300">
          {children}
        </code>
      )
    }
    // Fenced code block
    const language = className?.replace('language-', '') ?? ''
    return (
      <code className={className} data-language={language}>
        {children}
      </code>
    )
  },
  pre: ({ children }) => (
    <pre className="rounded-lg bg-zinc-800 border border-zinc-700 p-4 my-3 overflow-x-auto text-sm font-mono text-zinc-300">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="my-3 overflow-x-auto rounded-lg border border-zinc-700">
      <table className="w-full text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-800 text-zinc-300">{children}</thead>,
  tbody: ({ children }) => <tbody className="divide-y divide-zinc-800">{children}</tbody>,
  tr: ({ children }) => <tr className="hover:bg-zinc-800/50 transition-colors">{children}</tr>,
  th: ({ children }) => (
    <th className="px-4 py-2 text-left text-xs font-semibold text-zinc-300 uppercase tracking-wider">
      {children}
    </th>
  ),
  td: ({ children }) => <td className="px-4 py-2 text-zinc-300">{children}</td>,
  hr: () => <hr className="my-6 border-zinc-700" />,
  img: ({ src, alt }) => (
    <img
      src={src}
      alt={alt ?? ''}
      className="max-w-full rounded-lg my-3 border border-zinc-700"
    />
  ),
  input: ({ checked, type, ...rest }) => {
    if (type === 'checkbox') {
      return (
        <input
          type="checkbox"
          checked={checked}
          readOnly
          className="mr-2 h-4 w-4 rounded border-zinc-600 bg-zinc-800 text-indigo-600"
          {...rest}
        />
      )
    }
    return <input type={type} {...rest} />
  },
}

export function MarkdownPreview({ content }: MarkdownPreviewProps) {
  return (
    <div className="h-full overflow-y-auto bg-zinc-900 p-6">
      <div className="max-w-none">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
  )
}
