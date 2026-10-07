import { Fragment, type ReactNode } from 'react';

/**
 * Rendu d'un Markdown restreint (articles, pages) en éléments React : titres ##/###, paragraphes,
 * listes, citations, **gras**, *italique*, [liens](https://… ou /chemin). Aucun HTML brut n'est
 * interprété et `dangerouslySetInnerHTML` n'est jamais utilisé (docs/06-SECURITY.md §5).
 */

const SAFE_LINK = /^(https:\/\/|\/(?!\/)|mailto:)/;

function inline(text: string, keyPrefix: string): ReactNode[] {
  const nodes: ReactNode[] = [];
  const pattern = /(\*\*([^*]+)\*\*)|(\*([^*]+)\*)|(\[([^\]]+)\]\(([^)\s]+)\))/g;
  let last = 0;
  let index = 0;
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    if (start > last) nodes.push(text.slice(last, start));
    const key = `${keyPrefix}-${index++}`;
    if (match[2]) nodes.push(<strong key={key}>{match[2]}</strong>);
    else if (match[4]) nodes.push(<em key={key}>{match[4]}</em>);
    else if (match[6] && match[7]) {
      const href = match[7];
      if (SAFE_LINK.test(href)) {
        const external = href.startsWith('https://');
        nodes.push(
          <a
            key={key}
            href={href}
            {...(external ? { rel: 'noopener noreferrer', target: '_blank' } : {})}
          >
            {match[6]}
          </a>,
        );
      } else {
        nodes.push(match[6]);
      }
    }
    last = start + match[0].length;
  }
  if (last < text.length) nodes.push(text.slice(last));
  return nodes;
}

type Block =
  { kind: 'h2' | 'h3' | 'p' | 'quote'; text: string } | { kind: 'ul' | 'ol'; items: string[] };

export function parseBlocks(markdown: string): Block[] {
  const blocks: Block[] = [];
  const lines = markdown.replace(/\r\n/g, '\n').split('\n');
  let paragraph: string[] = [];
  const flush = () => {
    if (paragraph.length) blocks.push({ kind: 'p', text: paragraph.join(' ') });
    paragraph = [];
  };
  for (const raw of lines) {
    const line = raw.trim();
    if (!line) {
      flush();
      continue;
    }
    const heading = /^(#{2,3})\s+(.*)$/.exec(line);
    const bullet = /^[-*]\s+(.*)$/.exec(line);
    const numbered = /^\d+[.)]\s+(.*)$/.exec(line);
    const last = blocks.at(-1);
    if (heading) {
      flush();
      blocks.push({ kind: heading[1] === '##' ? 'h2' : 'h3', text: heading[2]! });
    } else if (bullet || numbered) {
      flush();
      const kind = bullet ? 'ul' : 'ol';
      const item = (bullet ?? numbered)![1]!;
      if (last && last.kind === kind) last.items.push(item);
      else blocks.push({ kind, items: [item] });
    } else if (line.startsWith('>')) {
      flush();
      blocks.push({ kind: 'quote', text: line.replace(/^>\s?/, '') });
    } else {
      paragraph.push(line);
    }
  }
  flush();
  return blocks;
}

export function Markdown({ source }: { source: string }) {
  return (
    <>
      {parseBlocks(source).map((block, i) => {
        const key = `b${i}`;
        switch (block.kind) {
          case 'h2':
            return <h2 key={key}>{inline(block.text, key)}</h2>;
          case 'h3':
            return <h3 key={key}>{inline(block.text, key)}</h3>;
          case 'quote':
            return <blockquote key={key}>{inline(block.text, key)}</blockquote>;
          case 'ul':
          case 'ol': {
            const List = block.kind;
            return (
              <List key={key}>
                {block.items.map((item, j) => (
                  <li key={j}>{inline(item, `${key}-${j}`)}</li>
                ))}
              </List>
            );
          }
          default:
            return <p key={key}>{inline(block.text, key)}</p>;
        }
      })}
    </>
  );
}

export function MarkdownFragment({ text }: { text: string }) {
  return <Fragment>{inline(text, 'f')}</Fragment>;
}
