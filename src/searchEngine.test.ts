import { describe, expect, it } from 'vitest'
import { DocumentSearchEngine, Trie, tokenize } from './searchEngine'

describe('Trie', () => {
  it('shares prefixes and records document postings', () => {
    const trie = new Trie()
    trie.insert('tree', 'a', 0)
    trie.insert('trie', 'a', 1)
    trie.insert('trie', 'b', 4)

    expect(trie.wordCount).toBe(2)
    expect(trie.find('trie')?.postings.get('a')?.count).toBe(1)
    expect(trie.find('trie')?.postings.size).toBe(2)
    expect(trie.suggest('tr').map((item) => item.word)).toEqual(['trie', 'tree'])
  })

  it('reports a stopped character path', () => {
    const trie = new Trie()
    trie.insert('search', 'doc', 0)
    expect(trie.path('seal')).toEqual([
      { character: 's', found: true }, { character: 'e', found: true },
      { character: 'a', found: true }, { character: 'l', found: false },
    ])
  })
})

describe('DocumentSearchEngine', () => {
  const documents = [
    { id: '1', title: 'Trie guide', body: 'A trie supports prefix search.', color: '#000' },
    { id: '2', title: 'Search guide', body: 'Search uses an index and trie.', color: '#000' },
  ]

  it('normalizes text and ranks exact multi-term matches', () => {
    const engine = new DocumentSearchEngine(documents)
    expect(tokenize('Trie, SEARCH!')).toEqual(['trie', 'search'])
    expect(engine.search('TRIE search').map((result) => result.document.id)).toEqual(['1', '2'])
  })

  it('rebuilds cleanly after a document collection changes', () => {
    const engine = new DocumentSearchEngine(documents)
    engine.rebuild([documents[0]])
    expect(engine.metrics().documents).toBe(1)
    expect(engine.search('index')).toEqual([])
  })
})
