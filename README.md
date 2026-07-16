# TrieSearch

An interactive document searcher built around a custom character trie. It indexes document tokens, supports exact multi-word retrieval, provides prefix autocomplete, and visualizes the query traversal path.

## What it demonstrates

- **Trie:** shared character paths with `Map<string, TrieNode>` child edges.
- **Posting lists:** terminal trie nodes retain document IDs, occurrence counts, and positions.
- **Document retrieval:** multi-word queries intersect posting lists, then rank results by term frequency and title relevance.
- **Complexity:** insertion, exact lookup, and prefix location are `O(L)` for a term length `L`; collecting suggestions additionally visits matching descendants.

## Run locally

```bash
npm install
npm run dev
```

Run checks with `npm run test`, `npm run lint`, and `npm run build`.

## Search model

1. Text is normalized into lowercase word tokens.
2. Every token is inserted character-by-character into the trie.
3. Terminal nodes receive/update a posting for the originating document.
4. Exact query terms retrieve documents through those postings; prefix input is traversed to generate autocomplete suggestions.

The project intentionally uses a from-scratch trie rather than hiding search behind an external search service.
