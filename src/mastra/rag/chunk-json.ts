import { readFile } from 'node:fs/promises';
import { MDocument } from '@mastra/rag';

const pioneerProfileBook = JSON.parse(
	await readFile(
		new URL(
			'../../../data/pioneers_profile_book_su2025.json',
			import.meta.url,
		),
		'utf8',
	),
);

const doc = MDocument.fromJSON(JSON.stringify(pioneerProfileBook));
console.log(doc);

const chunks = await doc.chunk({
	maxSize: 10,
});

console.log(chunks);
