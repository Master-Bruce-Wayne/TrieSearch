import { FormEvent, useMemo, useState } from 'react'
import { DocumentRecord, DocumentSearchEngine, SearchResult, sampleDocuments, tokenize } from './searchEngine'

const colors = ['#8b5cf6', '#38bdf8', '#34d399', '#f59e0b', '#f472b6']

function highlight(text: string, terms: string[]) {
  if (!terms.length) return text
  const expression = new RegExp(`(${terms.map((term) => term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|')})`, 'gi')
  return text.split(expression).map((part, index) =>
    terms.some((term) => part.toLowerCase() === term.toLowerCase()) ? <mark key={index}>{part}</mark> : part,
  )
}

function snippet(body: string, terms: string[]) {
  const match = terms.map((term) => body.toLowerCase().indexOf(term)).find((position) => position >= 0) ?? 0
  const start = Math.max(0, match - 55)
  const end = Math.min(body.length, match + 150)
  return `${start ? '…' : ''}${body.slice(start, end)}${end < body.length ? '…' : ''}`
}

function App() {
  const [documents, setDocuments] = useState<DocumentRecord[]>(sampleDocuments)
  const [query, setQuery] = useState('trie')
  const [isAdding, setIsAdding] = useState(false)
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [selected, setSelected] = useState<string>('trie-notes')

  const engine = useMemo(() => new DocumentSearchEngine(documents), [documents])
  const results = useMemo<SearchResult[]>(() => engine.search(query), [engine, query])
  const queryTerms = tokenize(query)
  const lastTerm = queryTerms[queryTerms.length - 1] ?? ''
  const suggestions = lastTerm ? engine.trie.suggest(lastTerm) : []
  const path = lastTerm ? engine.trie.path(lastTerm) : []
  const metrics = engine.metrics()

  const chooseSuggestion = (word: string) => {
    const tokens = tokenize(query)
    tokens[tokens.length - 1] = word
    setQuery(tokens.join(' '))
  }

  const addDocument = (event: FormEvent) => {
    event.preventDefault()
    if (!title.trim() || !body.trim()) return
    const document = { id: `${Date.now()}`, title: title.trim(), body: body.trim(), color: colors[documents.length % colors.length] }
    setDocuments((items) => [...items, document])
    setSelected(document.id)
    setTitle('')
    setBody('')
    setIsAdding(false)
  }

  const deleteDocument = (id: string) => {
    setDocuments((items) => items.filter((item) => item.id !== id))
    if (selected === id) setSelected(documents.find((item) => item.id !== id)?.id ?? '')
  }

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand"><span className="brand-mark">T</span><span>Trie<span className="muted">Search</span></span></div>
        <div className="status"><span className="status-dot" />Custom trie index active</div>
      </header>

      <section className="hero">
        <div className="eyebrow">DATA STRUCTURES × INFORMATION RETRIEVAL</div>
        <h1>Find the signal in<br /><em>every document.</em></h1>
        <p>A document searcher backed by a character trie, built to make prefix lookup, autocomplete, and index traversal tangible.</p>
      </section>

      <section className="search-panel" aria-label="Search documents">
        <div className="search-row">
          <span className="search-icon">⌕</span>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search the document index…" aria-label="Search documents" autoComplete="off" />
          {query && <button className="clear-button" onClick={() => setQuery('')} aria-label="Clear search">×</button>}
          <kbd>ENTER</kbd>
        </div>
        <div className="suggestions">
          <span className="suggestion-label">PREFIX MATCHES</span>
          {suggestions.length ? suggestions.map((suggestion) => (
            <button key={suggestion.word} onClick={() => chooseSuggestion(suggestion.word)}>
              <span>{suggestion.word}</span><small>{suggestion.frequency} occurrences</small>
            </button>
          )) : <span className="empty-suggestion">Type a word to explore the trie</span>}
        </div>
      </section>

      <section className="metrics" aria-label="Index metrics">
        <Metric number={metrics.documents} label="DOCUMENTS" detail="Indexed sources" />
        <Metric number={metrics.words} label="UNIQUE WORDS" detail="Terminal trie nodes" />
        <Metric number={metrics.nodes} label="TRIE NODES" detail="Shared character paths" />
        <Metric number={metrics.tokens} label="TOKENS" detail="Total indexed terms" />
      </section>

      <section className="workspace">
        <aside className="sidebar">
          <div className="section-heading"><div><span>COLLECTION</span><strong>Documents</strong></div><button className="add-button" onClick={() => setIsAdding(true)}>+ Add</button></div>
          <div className="document-list">
            {documents.map((document) => <button className={`document-item ${selected === document.id ? 'selected' : ''}`} key={document.id} onClick={() => setSelected(document.id)}>
              <span className="doc-color" style={{ background: document.color }} />
              <span><b>{document.title}</b><small>{tokenize(document.body).length} tokens</small></span>
            </button>)}
          </div>
          {selected && <button className="delete-document" onClick={() => deleteDocument(selected)}>Remove selected document</button>}
          <div className="complexity-card">
            <span>WHY A TRIE?</span>
            <p>Characters are shared across common prefixes—so lookup time grows with the query length, not the vocabulary size.</p>
            <div><code>insert</code><b>O(L)</b></div><div><code>lookup</code><b>O(L)</b></div><div><code>prefix</code><b>O(L + K)</b></div>
          </div>
        </aside>

        <section className="results-pane">
          <div className="results-header"><div><span className="eyebrow">SEARCH RESULTS</span><h2>{query ? `${results.length} document${results.length === 1 ? '' : 's'} found` : 'Ready to search'}</h2></div><span className="exact-badge">Exact terms + ranked</span></div>
          {query && !results.length && <div className="empty-results"><span>⌁</span><h3>No exact document match</h3><p>Try selecting a prefix suggestion or searching a different indexed word.</p></div>}
          <div className="result-list">
            {results.map((result, index) => <article className="result-card" key={result.document.id}>
              <div className="result-number">0{index + 1}</div>
              <div className="result-content"><div className="result-title"><h3>{highlight(result.document.title, result.matches)}</h3><span>Score {result.score}</span></div><p>{highlight(snippet(result.document.body, result.matches), result.matches)}</p><div className="result-footer"><div>{result.matches.map((match) => <span className="term-pill" key={match}>{match}</span>)}</div><small>{result.occurrences} matched occurrence{result.occurrences === 1 ? '' : 's'}</small></div></div>
            </article>)}
          </div>
        </section>

        <aside className="trie-panel">
          <span className="eyebrow">LIVE TRAVERSAL</span>
          <h2>Trie path</h2>
          <p>Following each character of <code>{lastTerm || 'your query'}</code></p>
          <div className="path-visual" aria-label="Current trie traversal">
            <div className="root-node">ROOT</div>
            {path.length ? path.map((step, index) => <div className="path-step" key={`${step.character}-${index}`}><i className={step.found ? 'connected' : 'missing'} /><span className={step.found ? '' : 'not-found'}>{step.character}</span><small>{step.found ? 'node found' : 'path stops'}</small></div>) : <div className="path-placeholder">Start typing to trace a branch.</div>}
            {path.length > 0 && path.every((step) => step.found) && <div className="terminal-node">{engine.trie.find(lastTerm)?.isWord ? '✓ terminal word' : 'prefix node'}</div>}
          </div>
          <div className="index-note"><b>Index strategy</b><p>Each terminal node stores document postings, occurrence counts, and token positions for direct retrieval.</p></div>
        </aside>
      </section>

      {isAdding && <div className="modal-backdrop" role="presentation"><form className="document-form" onSubmit={addDocument}><div><span className="eyebrow">NEW SOURCE</span><button type="button" onClick={() => setIsAdding(false)} className="close-form">×</button></div><h2>Add a document</h2><label>Title<input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="e.g. Graph traversal notes" autoFocus /></label><label>Document text<textarea value={body} onChange={(event) => setBody(event.target.value)} placeholder="Paste text to tokenize and index…" rows={6} /></label><button className="primary-button" type="submit">Index document <span>→</span></button></form></div>}

      <footer><span>Built from first principles</span><span>Trie · postings list · frequency ranking</span></footer>
    </main>
  )
}

function Metric({ number, label, detail }: { number: number; label: string; detail: string }) {
  return <div className="metric"><strong>{number.toLocaleString()}</strong><span>{label}</span><small>{detail}</small></div>
}

export default App
