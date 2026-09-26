import { tableKey, type SchemaGraph, type SchemaRelation, type SchemaTable } from "./schema.graph";

const PAGE_STYLE = `
:root { color: #1c1917; background: #f6f3ee; font-family: "Iowan Old Style", Palatino, "Palatino Linotype", Georgia, serif; }
body { margin: 0; }
#app { max-width: 1200px; margin: 0 auto; padding: 2rem 1.25rem 3rem; }
header h1 { margin: 0 0 0.25rem; font-size: 2rem; font-weight: 600; }
header p, .summary, .note, .caption { color: #57534e; }
a { color: inherit; }
.summary { margin: 1rem 0; }
.graph { background: white; border: 1px solid #e7e5e4; border-radius: 0.6rem; padding: 0.75rem 0.75rem 0.25rem; overflow-x: auto; }
.graph svg { display: block; width: 100%; height: auto; min-width: 20rem; }
.graph .node { fill: #fff; stroke: #d6d3d1; stroke-width: 1.5; }
.graph .node.selected { fill: #fff7ed; stroke: #c2410c; stroke-width: 2.5; }
.graph .edge { fill: none; stroke: #9a3412; stroke-width: 1.6; }
.graph .edge.dim { stroke: #d6d3d1; }
.graph text.node-label { fill: #1c1917; font-size: 14px; font-family: ui-sans-serif, system-ui, sans-serif; }
.graph text.edge-label { fill: #57534e; font-size: 11px; font-family: ui-sans-serif, system-ui, sans-serif; }
.panels { display: grid; grid-template-columns: 16rem minmax(0, 1fr) 18rem; gap: 1rem; align-items: start; margin-top: 1rem; }
section { background: white; border: 1px solid #e7e5e4; border-radius: 0.6rem; padding: 0.9rem 1rem 1rem; }
h2 { margin: 0 0 0.75rem; font-size: 1.15rem; }
ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 0.35rem; }
.tables a, .relations li { display: block; border-radius: 0.4rem; padding: 0.45rem 0.55rem; }
.tables a { text-decoration: none; border: 1px solid transparent; }
.tables a[aria-current="page"], .tables a:hover { background: #fff7ed; border-color: #fdba74; }
.tables small, .relations small { display: block; color: #78716c; font-family: ui-sans-serif, system-ui, sans-serif; font-size: 0.75rem; }
.field-group { margin: 0 0 1rem; }
.field-group h3 { margin: 0 0 0.4rem; font-size: 0.95rem; font-family: ui-sans-serif, system-ui, sans-serif; }
table { width: 100%; border-collapse: collapse; }
th, td { text-align: left; padding: 0.4rem 0.35rem; border-bottom: 1px solid #e7e5e4; vertical-align: top; font-size: 0.92rem; }
th { color: #57534e; font-size: 0.8rem; font-weight: 600; }
code { font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace; font-size: 0.84em; }
.relations li { background: #fafaf9; }
.footer { margin-top: 1rem; }
.error { color: #b91c1c; }
@media (max-width: 960px) { .panels { grid-template-columns: 1fr; } }
`;

type Box = { x: number; y: number; w: number; h: number };

export function renderHealthPage(): string {
  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Schemat bazy</title>
</head>
<body>
  <p>Schemat bazy działa.</p>
</body>
</html>`;
}

export function renderSchemaPage(input: {
  graph: SchemaGraph;
  selected?: { schema: string; name: string };
  error?: string;
}): string {
  const selectedKey = input.selected ? tableKey(input.selected.schema, input.selected.name) : undefined;
  const selectedKnown = selectedKey
    ? input.graph.tables.some((table) => tableKey(table.schema, table.name) === selectedKey)
    : false;
  const fieldTables = selectedKnown
    ? input.graph.tables.filter((table) => tableKey(table.schema, table.name) === selectedKey)
    : input.graph.tables;
  const visibleRelations = selectedKnown
    ? input.graph.relations.filter((relation) => relationTouches(relation, selectedKey!))
    : input.graph.relations;
  const columnCount = input.graph.tables.reduce((sum, table) => sum + table.columns.length, 0);
  const missing = input.selected && !selectedKnown ? "Nie ma takiej tabeli." : "";

  return `<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Schemat bazy</title>
  <style>${PAGE_STYLE}</style>
</head>
<body>
  <div id="app">
    <header>
      <h1>Schemat bazy</h1>
      <p>Bieżące tabele, pola i relacje odczytane z Postgresa.</p>
    </header>
    <p class="summary">${escapeHtml(summary(input.graph.tables.length, columnCount, input.graph.relations.length))}</p>
    <p class="error">${escapeHtml(input.error ?? "")}</p>
    <p class="note">${escapeHtml(missing)}</p>
    <div class="graph">
      ${renderGraph(input.graph, selectedKnown ? selectedKey : undefined)}
      <p class="caption">Strzałka prowadzi od klucza obcego do wskazanej tabeli.</p>
    </div>
    <div class="panels">
      <section id="tabele">
        <h2>Tabele</h2>
        ${renderTableList(input.graph.tables, selectedKnown ? selectedKey : undefined)}
      </section>
      <section id="pola">
        <h2>Pola</h2>
        ${renderFields(fieldTables)}
      </section>
      <section id="relacje">
        <h2>Relacje</h2>
        ${renderRelations(visibleRelations, input.graph.relations.length === 0)}
      </section>
    </div>
    <p class="footer"><a href="/schema">Dane JSON</a></p>
  </div>
</body>
</html>`;
}

function summary(tables: number, columns: number, relations: number): string {
  return [polishCount(tables, "tabela", "tabele", "tabel"), polishCount(columns, "pole", "pola", "pól"), polishCount(relations, "relacja", "relacje", "relacji")].join(" · ");
}

function polishCount(count: number, one: string, few: string, many: string): string {
  const absolute = Math.abs(count);
  const mod10 = absolute % 10;
  const mod100 = absolute % 100;
  if (mod10 === 1 && mod100 !== 11) return `${count} ${one}`;
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return `${count} ${few}`;
  return `${count} ${many}`;
}

function renderTableList(tables: SchemaTable[], selectedKey: string | undefined): string {
  if (tables.length === 0) return "<p>Brak tabel.</p>";
  const items = tables
    .map((table) => {
      const key = tableKey(table.schema, table.name);
      const current = key === selectedKey ? ' aria-current="page"' : "";
      return `<li><a href="?table=${encodeURIComponent(key)}"${current}><code>${escapeHtml(table.name)}</code><small>${escapeHtml(table.schema)} · ${escapeHtml(polishCount(table.columns.length, "pole", "pola", "pól"))}</small></a></li>`;
    })
    .join("");
  const clear = selectedKey ? '<li><a href="/">Wszystkie</a></li>' : "";
  return `<ul class="tables">${clear}${items}</ul>`;
}

function renderFields(tables: SchemaTable[]): string {
  if (tables.length === 0) return "<p>Brak pól.</p>";
  return tables
    .map((table) => {
      const rows = table.columns
        .map((column) => {
          return `<tr data-column-name="${escapeHtml(column.name)}" data-data-type="${escapeHtml(column.dataType)}" data-nullable="${column.nullable ? "true" : "false"}" data-primary-key="${column.primaryKey ? "true" : "false"}" data-foreign-key="${column.foreignKey ? "true" : "false"}"><td><code>${escapeHtml(column.name)}</code></td><td><code>${escapeHtml(column.dataType)}</code></td><td>${column.nullable ? "tak" : "nie"}</td><td>${escapeHtml(keyLabel(column.primaryKey, column.foreignKey))}</td></tr>`;
        })
        .join("");
      return `<div class="field-group"><h3><code>${escapeHtml(tableKey(table.schema, table.name))}</code></h3><table><thead><tr><th>Nazwa</th><th>Typ</th><th>Puste</th><th>Klucz</th></tr></thead><tbody>${rows}</tbody></table></div>`;
    })
    .join("");
}

function keyLabel(primaryKey: boolean, foreignKey: boolean): string {
  if (primaryKey && foreignKey) return "klucz główny, klucz obcy";
  if (primaryKey) return "klucz główny";
  if (foreignKey) return "klucz obcy";
  return "—";
}

function renderRelations(relations: SchemaRelation[], noneAtAll: boolean): string {
  if (relations.length === 0) return `<p>${noneAtAll ? "Brak relacji." : "Brak relacji dla tej tabeli."}</p>`;
  const items = relations
    .map((relation) => {
      const from = `${relation.fromSchema}.${relation.fromTable} (${relation.fromColumns.join(", ")})`;
      const to = `${relation.toSchema}.${relation.toTable} (${relation.toColumns.join(", ")})`;
      return `<li data-relation-name="${escapeHtml(relation.name)}" data-from-table="${escapeHtml(tableKey(relation.fromSchema, relation.fromTable))}" data-to-table="${escapeHtml(tableKey(relation.toSchema, relation.toTable))}"><code>${escapeHtml(from)} → ${escapeHtml(to)}</code><small>${escapeHtml(relation.name)}</small></li>`;
    })
    .join("");
  return `<ul class="relations">${items}</ul>`;
}

function relationTouches(relation: SchemaRelation, key: string): boolean {
  return tableKey(relation.fromSchema, relation.fromTable) === key || tableKey(relation.toSchema, relation.toTable) === key;
}

function renderGraph(graph: SchemaGraph, selectedKey: string | undefined): string {
  if (graph.tables.length === 0) return "<p>Brak tabel.</p>";
  const labels = new Map(graph.tables.map((table) => [tableKey(table.schema, table.name), nodeLabel(table, graph.tables)]));
  const width = Math.max(168, ...[...labels.values()].map((label) => Math.min(320, 36 + label.length * 8)));
  const height = 46;
  const gapX = 88;
  const gapY = 78;
  const columns = Math.ceil(Math.sqrt(graph.tables.length));
  const rows = Math.ceil(graph.tables.length / columns);
  const self = graph.relations.some((relation) => tableKey(relation.fromSchema, relation.fromTable) === tableKey(relation.toSchema, relation.toTable));
  const padTop = self ? 56 : 28;
  const pad = 28;
  const boxes = new Map<string, Box>();
  graph.tables.forEach((table, index) => {
    const column = index % columns;
    const row = Math.floor(index / columns);
    boxes.set(tableKey(table.schema, table.name), {
      x: pad + column * (width + gapX),
      y: padTop + row * (height + gapY),
      w: width,
      h: height,
    });
  });
  const svgWidth = pad * 2 + columns * width + (columns - 1) * gapX;
  const svgHeight = padTop + pad + rows * height + (rows - 1) * gapY;
  const edges = renderEdges(graph, boxes, selectedKey);
  const nodes = graph.tables
    .map((table) => {
      const key = tableKey(table.schema, table.name);
      const box = boxes.get(key)!;
      const selected = key === selectedKey ? " selected" : "";
      const label = labels.get(key) ?? table.name;
      return `<a href="?table=${encodeURIComponent(key)}" data-table="${escapeHtml(key)}"><rect class="node${selected}" x="${box.x}" y="${box.y}" width="${box.w}" height="${box.h}" rx="8"></rect><text class="node-label" x="${box.x + box.w / 2}" y="${box.y + box.h / 2 + 5}" text-anchor="middle">${escapeHtml(label)}</text></a>`;
    })
    .join("");
  return `<svg viewBox="0 0 ${svgWidth} ${svgHeight}" role="img" aria-label="Graf relacji"><defs><marker id="arrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#9a3412"></path></marker></defs>${edges}${nodes}</svg>`;
}

function nodeLabel(table: SchemaTable, tables: SchemaTable[]): string {
  const duplicate = tables.filter((other) => other.name === table.name).length > 1;
  return duplicate ? tableKey(table.schema, table.name) : table.name;
}

function renderEdges(graph: SchemaGraph, boxes: Map<string, Box>, selectedKey: string | undefined): string {
  const groups = new Map<string, SchemaRelation[]>();
  for (const relation of graph.relations) {
    const key = `${tableKey(relation.fromSchema, relation.fromTable)}>${tableKey(relation.toSchema, relation.toTable)}`;
    const group = groups.get(key) ?? [];
    group.push(relation);
    groups.set(key, group);
  }
  const paths: string[] = [];
  for (const group of groups.values()) {
    group.forEach((relation, index) => {
      const from = boxes.get(tableKey(relation.fromSchema, relation.fromTable));
      const to = boxes.get(tableKey(relation.toSchema, relation.toTable));
      if (!from || !to) return;
      const bend = (index - (group.length - 1) / 2) * 22;
      const path = edgePath(from, to, bend);
      const touches = !selectedKey || relationTouches(relation, selectedKey);
      const label = `${relation.fromColumns.join(", ")} → ${relation.toColumns.join(", ")}`;
      paths.push(
        `<path class="edge${touches ? "" : " dim"}" data-relation="${escapeHtml(relation.name)}" d="${path.d}" marker-end="url(#arrow)"></path><text class="edge-label" x="${path.labelX}" y="${path.labelY}" text-anchor="middle">${escapeHtml(label)}</text>`,
      );
    });
  }
  return paths.join("");
}

function edgePath(from: Box, to: Box, bend: number): { d: string; labelX: number; labelY: number } {
  if (from === to) {
    const startX = from.x + from.w;
    const startY = from.y + from.h / 2;
    const controlX = startX + 42;
    const controlY = from.y - 24;
    const endX = from.x + from.w / 2;
    const endY = from.y;
    return {
      d: `M ${startX} ${startY} C ${controlX} ${startY}, ${controlX} ${controlY}, ${endX} ${endY}`,
      labelX: controlX,
      labelY: controlY - 4,
    };
  }
  const start = borderPoint(from, center(to));
  const end = borderPoint(to, center(from));
  const control = {
    x: (start.x + end.x) / 2 + perpendicular(start, end).x * bend,
    y: (start.y + end.y) / 2 + perpendicular(start, end).y * bend,
  };
  const labelX = 0.25 * start.x + 0.5 * control.x + 0.25 * end.x;
  const labelY = 0.25 * start.y + 0.5 * control.y + 0.25 * end.y - 6;
  return {
    d: `M ${round(start.x)} ${round(start.y)} Q ${round(control.x)} ${round(control.y)} ${round(end.x)} ${round(end.y)}`,
    labelX: round(labelX),
    labelY: round(labelY),
  };
}

function center(box: Box): { x: number; y: number } {
  return { x: box.x + box.w / 2, y: box.y + box.h / 2 };
}

function borderPoint(box: Box, toward: { x: number; y: number }): { x: number; y: number } {
  const origin = center(box);
  const dx = toward.x - origin.x;
  const dy = toward.y - origin.y;
  const scale = 1 / Math.max(Math.abs(dx) / (box.w / 2), Math.abs(dy) / (box.h / 2), 1e-6);
  return { x: origin.x + dx * scale, y: origin.y + dy * scale };
}

function perpendicular(start: { x: number; y: number }, end: { x: number; y: number }): { x: number; y: number } {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const length = Math.hypot(dx, dy) || 1;
  return { x: -dy / length, y: dx / length };
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}
