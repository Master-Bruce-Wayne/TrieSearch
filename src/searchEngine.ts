export type DocumentRecord = {
  id: string
  title: string
  body: string
  color: string
}

export type Posting = { count: number; positions: number[] }

export class TrieNode {
  children = new Map<string, TrieNode>()
  isWord = false
  postings = new Map<string, Posting>()
}

export class Trie {
  readonly root = new TrieNode()
  nodeCount = 1
  wordCount = 0

  insert(word: string, documentId: string, position: number) {
    let node = this.root
    for (const character of word) {
      let child = node.children.get(character)
      if (!child) {
        child = new TrieNode()
        node.children.set(character, child)
        this.nodeCount += 1
      }
      node = child
    }
    if (!node.isWord) {
      node.isWord = true
      this.wordCount += 1
    }
    const posting = node.postings.get(documentId) ?? { count: 0, positions: [] }
    posting.count += 1
    posting.positions.push(position)
    node.postings.set(documentId, posting)
  }

  find(word: string) {
    let node = this.root
    for (const character of word) {
      const child = node.children.get(character)
      if (!child) return undefined
      node = child
    }
    return node
  }

  path(word: string) {
    const characters: { character: string; found: boolean }[] = []
    let node = this.root
    for (const character of word) {
      const child = node.children.get(character)
      characters.push({ character, found: Boolean(child) })
      if (!child) break
      node = child
    }
    return characters
  }

  suggest(prefix: string, limit = 6) {
    const start = this.find(prefix)
    if (!start) return [] as { word: string; documents: number; frequency: number }[]
    const results: { word: string; documents: number; frequency: number }[] = []
    const visit = (node: TrieNode, suffix: string) => {
      if (results.length > 120) return
      if (node.isWord) {
        const frequency = [...node.postings.values()].reduce((sum, item) => sum + item.count, 0)
        results.push({ word: prefix + suffix, documents: node.postings.size, frequency })
      }
      for (const [character, child] of node.children) visit(child, suffix + character)
    }
    visit(start, '')
    return results.sort((a, b) => b.frequency - a.frequency || a.word.localeCompare(b.word)).slice(0, limit)
  }
}

export const tokenize = (text: string): string[] => Array.from(text.toLowerCase().match(/[a-z0-9]+(?:'[a-z0-9]+)?/g) ?? [])

export type SearchResult = {
  document: DocumentRecord
  score: number
  matches: string[]
  occurrences: number
}

export class DocumentSearchEngine {
  trie = new Trie()
  private documents = new Map<string, DocumentRecord>()
  private documentTokens = new Map<string, string[]>()
  totalTokens = 0

  constructor(documents: DocumentRecord[] = []) { documents.forEach((document) => this.add(document)) }

  add(document: DocumentRecord) {
    this.documents.set(document.id, document)
    const tokens = tokenize(`${document.title} ${document.body}`)
    this.documentTokens.set(document.id, tokens)
    tokens.forEach((word, position) => this.trie.insert(word, document.id, position))
    this.totalTokens += tokens.length
  }

  rebuild(documents: DocumentRecord[]) {
    this.trie = new Trie()
    this.documents.clear()
    this.documentTokens.clear()
    this.totalTokens = 0
    documents.forEach((document) => this.add(document))
  }

  allDocuments() { return [...this.documents.values()] }

  search(rawQuery: string): SearchResult[] {
    const terms = [...new Set(tokenize(rawQuery))]
    if (!terms.length) return []
    const candidateIds: Map<string, Posting>[] = terms.map((term) => this.trie.find(term)?.postings ?? new Map<string, Posting>())
    if (candidateIds.some((postings) => postings.size === 0)) return []
    const results: SearchResult[] = []
    for (const documentId of candidateIds[0].keys()) {
      if (!candidateIds.every((postings) => postings.has(documentId))) continue
      const matches = terms.filter((term) => candidateIds[terms.indexOf(term)].has(documentId))
      const occurrences = candidateIds.reduce((sum, postings) => sum + (postings.get(documentId)?.count ?? 0), 0)
      const document = this.documents.get(documentId)!
      const titleBonus = terms.reduce((sum, term) => sum + (tokenize(document.title).includes(term) ? 3 : 0), 0)
      results.push({ document, matches, occurrences, score: occurrences * 10 + titleBonus + matches.length * 5 })
    }
    return results.sort((a, b) => b.score - a.score || b.occurrences - a.occurrences)
  }

  metrics() {
    return {
      documents: this.documents.size,
      words: this.trie.wordCount,
      nodes: this.trie.nodeCount,
      tokens: this.totalTokens,
    }
  }
}

export const sampleDocuments: DocumentRecord[] = [
  {
    id: 'trie-notes', color: '#8b5cf6', title: 'Trie Data Structure Notes',
    body: 'A trie stores strings by sharing common prefixes. Each node represents a character and paths represent words. Prefix search, autocomplete, and dictionary lookup all benefit from predictable traversal.',
  },
  {
    id: 'search-systems', color: '#38bdf8', title: 'Building Search Systems',
    body: 'Document search begins by tokenizing text and building an inverted index. A trie complements the index when users need instant prefix suggestions, fast autocomplete, and spelling exploration.',
  },
  {
    id: 'algorithms', color: '#34d399', title: 'Algorithms for Practical Applications',
    body: 'Choosing a data structure depends on the query pattern. Hash maps are excellent for exact lookup, while a trie makes prefix traversal natural. Search ranking can combine term frequency and title relevance.',
  },
  {
    id: 'complexity', color: '#f59e0b', title: 'Complexity Analysis Reference',
    body: 'Trie insertion and exact lookup take O(L) time where L is the word length. Prefix lookup also takes O(L), then visits matching descendants to produce suggestions.',
  },
]
