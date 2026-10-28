// Every Markdown table the site renders is plain GFM: a header row and body rows, with no row
// header the way the examples gallery's hand-built table has. That holds for the guide in every
// language, a reference note and a rule's page alike. Below 45rem it still needs to read as a
// vertical block per row (src/styles/global.css), so each cell needs its own column header back
// as a label; this copies the header row's plain text onto every body cell as a `data-label`
// attribute mdast-to-hast turns into a real one, since CSS alone cannot read a table's own
// header into a `::before` on a different cell.
import { toString } from 'mdast-util-to-string';
import { visit } from 'unist-util-visit';

export default function remarkDocTables() {
  return (tree) => {
    visit(tree, 'table', (table) => {
      const [head, ...rows] = table.children;
      if (!head) return;
      const labels = head.children.map((cell) => toString(cell));
      for (const row of rows) {
        row.children.forEach((cell, i) => {
          if (!labels[i]) return;
          cell.data = {
            ...cell.data,
            hProperties: { ...cell.data?.hProperties, dataLabel: labels[i] },
          };
        });
      }
    });
  };
}
