import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const components: Components = {
  p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
  ul: ({ children }) => <ul className="mb-2 list-disc space-y-0.5 pl-5 last:mb-0">{children}</ul>,
  ol: ({ children }) => <ol className="mb-2 list-decimal space-y-0.5 pl-5 last:mb-0">{children}</ol>,
  li: ({ children }) => <li>{children}</li>,
  strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
  em: ({ children }) => <em className="italic">{children}</em>,
  a: ({ children, href }) => (
    <a href={href} target="_blank" rel="noreferrer" className="underline underline-offset-2">
      {children}
    </a>
  ),
  blockquote: ({ children }) => (
    <blockquote className="mb-2 border-l-2 border-border pl-3 text-muted-foreground last:mb-0">
      {children}
    </blockquote>
  ),
  h1: ({ children }) => <h1 className="mb-1.5 text-base font-semibold">{children}</h1>,
  h2: ({ children }) => <h2 className="mb-1.5 text-sm font-semibold">{children}</h2>,
  h3: ({ children }) => <h3 className="mb-1.5 text-sm font-semibold">{children}</h3>,
  hr: () => <hr className="my-2 border-border" />,
  code: ({ children, className }) => {
    // Fenced code blocks get a `language-*` className on the inner <code>;
    // inline code doesn't — style each case differently.
    const isBlock = /language-/.test(className ?? "");
    if (isBlock) {
      return <code className={className}>{children}</code>;
    }
    return (
      <code className="rounded bg-foreground/10 px-1 py-0.5 font-mono text-[0.85em]">
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-2 overflow-x-auto rounded-md bg-foreground/10 p-2 font-mono text-[0.85em] last:mb-0">
      {children}
    </pre>
  ),
  table: ({ children }) => (
    <div className="mb-2 overflow-x-auto rounded-md border border-border last:mb-0">
      <table className="w-full border-collapse text-left text-sm">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-muted">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="border-b border-border last:border-0">{children}</tr>,
  th: ({ children }) => (
    <th className="px-2 py-1 font-medium whitespace-nowrap">{children}</th>
  ),
  td: ({ children }) => <td className="px-2 py-1 whitespace-nowrap">{children}</td>,
};

export function ChatMarkdown({ content }: { content: string }) {
  return (
    <div className="[&_>*:last-child]:mb-0">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  );
}
