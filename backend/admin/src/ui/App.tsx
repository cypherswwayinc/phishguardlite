
import React, { useEffect, useMemo, useState } from 'react'

// Cloud API configuration
const API_BASE_URL = 'https://ysnpbaet5e.execute-api.us-east-1.amazonaws.com/Prod'

type Report = {
  name: string
  receivedAt?: string
  url?: string
  pageUrl?: string
  tenantKey?: string
  reasons?: string[]
  label?: string // Add label field for filtering
}
type Digest = { name: string, updatedAt?: string }

function useFetch<T>(path: string, deps: any[] = []) {
  const [data, setData] = useState<T | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  useEffect(() => {
    let alive = true
    setLoading(true)
    // Use full API URL instead of relative path
    const fullUrl = path.startsWith('http') ? path : `${API_BASE_URL}${path}`
    fetch(fullUrl).then(r => r.json()).then(d => {
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
  const [labelFilter, setLabelFilter] = useState<string>('all')
  const [startDate, setStartDate] = useState<string>('')
  const [endDate, setEndDate] = useState<string>('')
  
  const items = useMemo(() => {
    const xs = data?.items || []
    let filtered = xs
    
    // Apply search filter
    if (q) {
      const qq = q.toLowerCase()
      filtered = filtered.filter(it => 
        (it.url||'').toLowerCase().includes(qq) || 
        (it.pageUrl||'').toLowerCase().includes(qq) || 
        (it.tenantKey||'').toLowerCase().includes(qq)
      )
    }
    
    // Apply label filter
    if (labelFilter !== 'all') {
      filtered = filtered.filter(it => it.label === labelFilter)
    }
    
    // Apply date range filter
    if (startDate || endDate) {
      filtered = filtered.filter(it => {
        if (!it.receivedAt) return false
        const reportDate = new Date(it.receivedAt)
        
        if (startDate && reportDate < new Date(startDate)) return false
        if (endDate && reportDate > new Date(endDate + 'T23:59:59')) return false
        
        return true
      })
    }
    
    return filtered
  }, [data, q, labelFilter, startDate, endDate])

  // Get unique labels from data for the dropdown
  const availableLabels = useMemo(() => {
    const labels = new Set<string>()
    data?.items?.forEach(item => {
      if (item.label) labels.add(item.label)
    })
    return Array.from(labels).sort()
  }, [data])

  return (
    <div className="card">
      <div className="toolbar">
        <input type="search" placeholder="Search URL, page or tenant…" value={q} onChange={e => setQ(e.target.value)} />
        
        {/* Label Filter Dropdown */}
        <select 
          value={labelFilter} 
          onChange={e => setLabelFilter(e.target.value)}
          style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px' }}
        >
          <option value="all">All Labels</option>
          {availableLabels.map(label => (
            <option key={label} value={label}>{label}</option>
          ))}
        </select>
        
        {/* Date Range Selectors */}
        <input 
          type="date" 
          value={startDate} 
          onChange={e => setStartDate(e.target.value)}
          placeholder="Start Date"
          style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px' }}
        />
        <input 
          type="date" 
          value={endDate} 
          onChange={e => setEndDate(e.target.value)}
          placeholder="End Date"
          style={{ padding: '8px 10px', border: '1px solid #ddd', borderRadius: '8px' }}
        />
        
        <button className="btn" onClick={() => location.reload()}>Refresh</button>
        
        {/* Clear Filters Button */}
        {(labelFilter !== 'all' || startDate || endDate) && (
          <button 
            className="btn" 
            onClick={() => {
              setLabelFilter('all')
              setStartDate('')
              setEndDate('')
            }}
            style={{ backgroundColor: '#f0f0f0' }}
          >
            Clear Filters
          </button>
        )}
      </div>
      
      {/* Filter Summary */}
      {(labelFilter !== 'all' || startDate || endDate) && (
        <div style={{ 
          marginBottom: '10px', 
          padding: '8px 12px', 
          backgroundColor: '#f8f9fa', 
          borderRadius: '6px',
          fontSize: '14px',
          color: '#666'
        }}>
          <strong>Active Filters:</strong>
          {labelFilter !== 'all' && <span style={{ marginLeft: '10px' }}>Label: {labelFilter}</span>}
          {startDate && <span style={{ marginLeft: '10px' }}>From: {startDate}</span>}
          {endDate && <span style={{ marginLeft: '10px' }}>To: {endDate}</span>}
          <span style={{ marginLeft: '10px' }}>Results: {items.length} of {data?.items?.length || 0}</span>
        </div>
      )}
      
      {loading ? <p>Loading…</p> : err ? <p>Error: {err}</p> : (
        <table>
          <thead>
            <tr>
              <th>Time (UTC)</th>
              <th>URL</th>
              <th>Label</th>
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
                <td>
                  <span className={`pill ${it.label === 'High Risk' ? 'high-risk' : it.label === 'Caution' ? 'caution' : 'safe'}`}>
                    {it.label || '—'}
                  </span>
                </td>
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
