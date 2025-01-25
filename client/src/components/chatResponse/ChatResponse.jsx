import ReactMarkdown from 'react-markdown';


import remarkMath from 'remark-math'; // For math formulas
import remarkGfm from 'remark-gfm'; // For tables and GitHub Flavored Markdown


import rehypeKatex from 'rehype-katex'; // For rendering math with KaTeX
import rehypePrism from 'rehype-prism-plus'; // For syntax highlighting
import rehypeHighlight from 'rehype-highlight'; // For syntax highlighting
import rehypeAddClasses from 'rehype-add-classes'; // For adding classes to elements
// import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
// import { tomorrow } from 'react-syntax-highlighter/dist/esm/styles/prism'; // Choose a theme


import 'katex/dist/katex.min.css'; // KaTeX CSS
import 'prismjs/themes/prism.css'; // Syntax highlighting theme
import 'highlight.js/styles/github-dark.css'; // Syntax highlighting theme
import './chatResponse.css';
import { visit } from 'unist-util-visit'; // Utility to traverse the AST

const ChatResponse = ({ answer }) => {
  return (
    <div>
  <ReactMarkdown
    remarkPlugins={[remarkMath, remarkGfm]}
    rehypePlugins={[
      rehypeKatex,
      rehypeHighlight, // Ensure rehype-highlight is applied
      [rehypeAddClasses, {
        table: 'markdown-table',
      }],
    ]}
    components={{
      code({ node, inline, className, children, ...props }) {
        // Extract the language from the className
        const match = /language-(\w+)/.exec(className || '');
        const language = match ? match[1] : 'text';

        return !inline ? (
          <div className="code-block">
            <div className="language-comment">{language}</div>
            <pre className={className}> {/* Wrap the code in a <pre> element */}
              <code {...props}>{children}</code>
            </pre>
          </div>
        ) : (
          <code className={className} {...props}>
            {children}
          </code>
        );
      },
    }}
  >
    {answer}
  </ReactMarkdown>
</div>
  );
};

export default ChatResponse;