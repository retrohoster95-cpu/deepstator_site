// Creates a new article file with all supported frontmatter fields.
// Usage: npm run new -- "Заголовок статьи"
import fs from 'node:fs';

const title = process.argv.slice(2).join(' ').trim();
if (!title) {
  console.error('Usage: npm run new -- "Заголовок статьи"');
  process.exit(1);
}
const map = { а:'a',б:'b',в:'v',г:'g',д:'d',е:'e',ё:'e',ж:'zh',з:'z',и:'i',й:'y',к:'k',л:'l',м:'m',н:'n',о:'o',п:'p',р:'r',с:'s',т:'t',у:'u',ф:'f',х:'h',ц:'c',ч:'ch',ш:'sh',щ:'shch',ъ:'',ы:'y',ь:'',э:'e',ю:'yu',я:'ya' };
const slug = title.toLowerCase().split('').map((c) => map[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 80);
const file = `content/articles/${slug}.md`;
if (fs.existsSync(file)) {
  console.error(`${file} already exists`);
  process.exit(1);
}
const today = new Date().toISOString().slice(0, 10);
fs.writeFileSync(file, `---
title: ${JSON.stringify(title)}
subtitle:            # optional — a one-line dek under the headline
excerpt:             # optional — otherwise the first paragraph is used
category: Общество   # must match a category in site.config.ts (new names are added automatically)
tags: []
date: ${today}       # publication date (YYYY-MM-DD); leave empty if unknown
updated:
language: ru
featured: false
cover:               # file name in content/media/, e.g. my-cover.jpg
coverAlt:            # short description of the cover image
draft: true          # set to false to publish
---

Первый абзац текста.

## Подзаголовок

Текст раздела. Заголовки ## и ### попадают в оглавление автоматически.

> Цитата или ключевая мысль.
`);
console.log(`✓ ${file} (draft) — set "draft: false" to publish`);
