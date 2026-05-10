'use client'

import React from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

type Props = { content: string }

// Inline styles for the "split-off" first column
const FIRST_COL_TH: React.CSSProperties = {
  backgroundColor: '#1e293b',
  color: '#f8fafc',
  borderRight: '3px solid #0f172a',
  minWidth: '160px',
}

const FIRST_COL_TD: React.CSSProperties = {
  backgroundColor: '#f1f5f9',
  color: '#0f172a',
  fontWeight: 700,
  borderRight: '3px solid #cbd5e1',
  minWidth: '160px',
  boxShadow: '4px 0 8px -4px rgba(15,23,42,0.14)',
}

export default function KnowledgeViewer({ content }: Props) {
  return (
    <div className="prose prose-sm max-w-none overflow-x-auto knowledge-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => (
            <h1 className="text-xl font-bold font-serif text-slate-800 mt-6 mb-3 pb-2 border-b border-slate-200">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-base font-bold font-serif text-slate-700 mt-5 mb-3 pb-1.5 border-b border-slate-100">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-sm font-bold text-slate-700 mt-4 mb-2">{children}</h3>
          ),
          p: ({ children }) => (
            <p className="text-sm text-slate-700 leading-relaxed mb-3">{children}</p>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 rounded-xl border border-slate-200">
              <table className="w-full text-xs border-collapse min-w-[600px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-slate-50 text-slate-600">{children}</thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-slate-100">{children}</tbody>
          ),
          // Inject data-first-col onto the first cell child of every row
          tr: ({ children }) => {
            const cells = React.Children.toArray(children)
            const tagged = cells.map((child, i) =>
              i === 0 && React.isValidElement(child)
                ? React.cloneElement(child as React.ReactElement<any>, { 'data-first-col': 'true' } as any)
                : child
            )
            return <tr className="hover:bg-slate-50/60 transition-colors">{tagged}</tr>
          },
          th: ({ children, ...rest }: any) => {
            const isFirst = rest['data-first-col'] === 'true'
            return (
              <th
                className="px-3 py-2.5 text-left font-semibold text-[11px] border-b border-slate-200 whitespace-nowrap"
                style={isFirst ? FIRST_COL_TH : undefined}
              >
                {children}
              </th>
            )
          },
          td: ({ children, ...rest }: any) => {
            const isFirst = rest['data-first-col'] === 'true'
            return (
              <td
                className="px-3 py-2.5 text-[11px] leading-relaxed border-r border-slate-100 last:border-r-0"
                style={isFirst ? FIRST_COL_TD : { color: '#334155' }}
              >
                {children}
              </td>
            )
          },
          ul: ({ children }) => (
            <ul className="list-disc pl-5 space-y-1 text-sm text-slate-700 mb-3">{children}</ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal pl-5 space-y-1 text-sm text-slate-700 mb-3">{children}</ol>
          ),
          li: ({ children }) => <li className="leading-relaxed">{children}</li>,
          strong: ({ children }) => (
            <strong className="font-semibold text-slate-800">{children}</strong>
          ),
          blockquote: ({ children }) => (
            <blockquote className="pl-4 border-l-4 border-slate-300 text-slate-500 italic my-3 text-sm">
              {children}
            </blockquote>
          ),
          code: ({ children }) => (
            <code className="bg-slate-100 text-slate-700 px-1.5 py-0.5 rounded text-[11px] font-mono">
              {children}
            </code>
          ),
          hr: () => <hr className="my-4 border-slate-200" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
