
import React, { useEffect, useMemo, useState } from 'react'

type Report = {
  name: string
  receivedAt?: string
  url?: string
  pageUrl?: string
  tenantKey?: string
  reasons?: string[]
}
type Digest = { name: string, updatedAt?: string }

function useFetch<T>(path: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setLoading(true)
    fetch(path).then(r => r.json()).then(d => {
      if (!alive) return
      setData(d)
      setLoading(false)
    }).catch(e => {
      if (!alive) return
      setErr(String(e))
      setLoading(false)
    })
    return () => { alive = false }
  }, deps)
  return { data, loading, err }
}

function Reports() {
  const { data, loading, err } = useFetch<{items: Report[]}>('/admin/api/reports', [])
  const [q, setQ] = useState('')
  const [sel, setSel] = useState<Report | null>(null)
  const items = useMemo(() => {
    const xs = data?.items || []
    if (!q) return xs
    const qq = q.toLowerCase()
    return xs.filter(it => (it.url||'').toLowerCase().includes(qq) || (it.pageUrl||'').toLowerCase().includes(qq) || (it.tenantKey||'').toLowerCase().includes(qq))
  }, [data, q])

  return (
    <div className="card">
      <div className="toolbar">
        <input type="search" placeholder="Search URL, page or tenant…" value={q} onChange={e => setQ(e.target.value)} />
        <button className="btn" onClick={() => location.reload()}>Refresh</button>
      </div>
      {loading ? <p>Loading…</p> : err ? <p>Error: {err}</p> : (
        <table>
          <thead>
            <tr>
              <th>Time (UTC)</th>
              <th>URL</th>
              <th>Reasons</th>
              <th>Tenant</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map(it => (
              <tr key={it.name}>
                <td style={{whiteSpace:'nowrap'}}>{it.receivedAt || '—'}</td>
                <td><div style={{maxWidth:520, overflowWrap:'anywhere'}}>{it.url}</div><div style={{color:'#666', fontSize:12}}>{it.pageUrl}</div></td>
                <td>{(it.reasons||[]).slice(0,4).map((r,i) => <span className="pill" key={i}>{r}</span>)}</td>
                <td>{it.tenantKey || '—'}</td>
                <td>
                  <button className="btn" onClick={() => setSel(it)}>View JSON</button>
                  <a className="btn" href={`/admin/api/report/${encodeURIComponent(it.name)}`} target="_blank">Download</a>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {sel && (
        <div className="modal-backdrop" onClick={() => setSel(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Report JSON</h3>
            <pre>{JSON.stringify(sel, null, 2)}</pre>
            <div style={{display:'flex', gap:10}}>
              <button className="btn" onClick={() => {
                navigator.clipboard.writeText(JSON.stringify(sel, null, 2))
              }}>Copy JSON</button>
              <button className="btn" onClick={() => setSel(null)}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function Digests() {
  const { data, loading, err } = useFetch<{items: Digest[]}>('/admin/api/digests', [])
  return (
    <div className="card">
      {loading ? <p>Loading…</p> : err ? <p>Error: {err}</p> : (
        <table>
          <thead>
            <tr>
              <th>File</th>
              <th>Updated</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.items||[]).map(d => (
              <tr key={d.name}>
                <td>{d.name}</td>
                <td>{d.updatedAt || '—'}</td>
                <td><a className="btn primary" href={`/admin/api/digest/${encodeURIComponent(d.name)}`} target="_blank">Open / Download</a></td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}

export default function App() {
  const [tab, setTab] = useState<'reports'|'digests'>('reports')
  return (
    <>
      <div className="tabs">
        <div className={`tab ${tab==='reports'?'active':''}`} onClick={() => setTab('reports')}>Reports</div>
        <div className={`tab ${tab==='digests'?'active':''}`} onClick={() => setTab('digests')}>Weekly Digests</div>
      </div>
      {tab==='reports' ? <Reports /> : <Digests />}
    </>
  )
}
