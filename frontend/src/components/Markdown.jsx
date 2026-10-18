import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';

/** Renders Markdown safely (raw HTML is not rendered) with tables, task lists and code highlighting. */
export default function Markdown({ children, className = '' }) {
  return (
    <div className={`prose ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[[rehypeHighlight, { detect: true, ignoreMissing: true }]]}
        components={{
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" />,
          img: ({ node, ...props }) => <img {...props} loading="lazy" alt={props.alt || ''} />,
        }}
      >
        {children || ''}
      </ReactMarkdown>
    </div>
  );
}
