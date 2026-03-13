import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
  if (!content) return null;

  // Pre-process content to handle potential double escaping and literal \n strings
  const cleanContent = content
    .replace(/\\n/g, '\n')
    .replace(/\r/g, '');

  return (
    <div className={`ai-summary-container font-normal text-slate-700 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-2xl font-bold text-slate-900 mt-6 mb-4">{children}</h1>,
          h2: ({ children }) => <h2 className="text-xl font-bold text-slate-900 mt-6 mb-3 pb-1 border-b border-slate-100">{children}</h2>,
          h3: ({ children }) => <h3 className="text-lg font-bold text-slate-800 mt-5 mb-2">{children}</h3>,
          h4: ({ children }) => <h4 className="text-base font-bold text-slate-800 mt-4 mb-2">{children}</h4>,
          p: ({ children }) => <p className="leading-relaxed mb-4 text-slate-700">{children}</p>,
          ul: ({ children }) => <ul className="list-disc ml-5 mb-4 space-y-2">{children}</ul>,
          ol: ({ children }) => <ol className="list-decimal ml-5 mb-4 space-y-2">{children}</ol>,
          li: ({ children }) => <li className="pl-1">{children}</li>,
          strong: ({ children }) => <strong className="font-bold text-slate-900">{children}</strong>,
          hr: () => <hr className="my-6 border-slate-100" />,
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-primary-200 pl-4 py-1 italic text-slate-600 my-4 bg-slate-50 rounded-r">
              {children}
            </blockquote>
          ),
          table: ({ children }) => (
            <div className="overflow-x-auto my-4 border border-slate-200 rounded-lg">
              <table className="w-full text-sm text-left border-collapse">{children}</table>
            </div>
          ),
          th: ({ children }) => <th className="px-4 py-2 bg-slate-50 border-b border-slate-200 font-bold text-slate-900">{children}</th>,
          td: ({ children }) => <td className="px-4 py-2 border-b border-slate-100 text-slate-700">{children}</td>,
        }}
      >
        {cleanContent}
      </ReactMarkdown>
      
      <style>{`
        .ai-summary-container {
          line-height: 1.6;
          max-width: 100%;
        }
        .ai-summary-container p:last-child {
          margin-bottom: 0;
        }
      `}</style>
    </div>
  );
};