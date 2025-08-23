
import React, { useState, useEffect } from 'react';

// Replace with your actual API Gateway URL
const API_BASE_URL = 'https://YOUR_API_ID.execute-api.YOUR_REGION.amazonaws.com/Prod'

interface Report {
  id: string;
  url: string;
  reportedAt: string;
  tenantKey?: string;
  reasons?: string[];
  context?: any;
}

interface Summary {
  totalReports: number;
  todayReports: number;
  tenantBreakdown: Record<string, number>;
  lastUpdated: string;
}

const App: React.FC = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTenant, setSelectedTenant] = useState<string>('');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch summary
      const summaryResponse = await fetch(`${API_BASE_URL}/admin/api/reports/summary`);
      if (!summaryResponse.ok) {
        throw new Error(`Failed to fetch summary: ${summaryResponse.status}`);
      }
      const summaryData = await summaryResponse.json();
      setSummary(summaryData);

      // Fetch reports
      const reportsResponse = await fetch(`${API_BASE_URL}/admin/api/reports?limit=200`);
      if (!reportsResponse.ok) {
        throw new Error(`Failed to fetch reports: ${reportsResponse.status}`);
      }
      const reportsData = await reportsResponse.json();
      setReports(reportsData.items || []);

    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    const matchesSearch = report.url.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (report.tenantKey || '').toLowerCase().includes(searchTerm.toLowerCase());
    const matchesTenant = !selectedTenant || report.tenantKey === selectedTenant;
    return matchesSearch && matchesTenant;
  });

  const tenants = summary ? Object.keys(summary.tenantBreakdown) : [];

  if (loading) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <h2>Loading...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '20px', color: 'red' }}>
        <h2>Error</h2>
        <p>{error}</p>
        <button onClick={fetchData}>Retry</button>
      </div>
    );
  }

  return (
    <div style={{ padding: '20px', maxWidth: '1200px', margin: '0 auto' }}>
      <h1>PhishGuard Lite Admin Dashboard</h1>
      
      {/* Summary Cards */}
      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
          <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Total Reports</h3>
            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{summary.totalReports}</div>
          </div>
          <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Today's Reports</h3>
            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{summary.todayReports}</div>
          </div>
          <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Active Tenants</h3>
            <div style={{ fontSize: '2em', fontWeight: 'bold' }}>{tenants.length}</div>
          </div>
          <div style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
            <h3>Last Updated</h3>
            <div style={{ fontSize: '1.2em' }}>{new Date(summary.lastUpdated).toLocaleString()}</div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div style={{ marginBottom: '20px', display: 'flex', gap: '20px', alignItems: 'center' }}>
        <div>
          <label htmlFor="search">Search: </label>
          <input
            id="search"
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search URLs or tenant keys..."
            style={{ padding: '8px', width: '300px' }}
          />
        </div>
        <div>
          <label htmlFor="tenant">Filter by Tenant: </label>
          <select
            id="tenant"
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            style={{ padding: '8px' }}
          >
            <option value="">All Tenants</option>
            {tenants.map(label => (
              <option key={label} value={label}>{label}</option>
            ))}
          </select>
        </div>
        <button onClick={fetchData} style={{ padding: '8px 16px' }}>Refresh</button>
      </div>

      {/* Reports Table */}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', border: '1px solid #ddd' }}>
          <thead>
            <tr style={{ background: '#f5f5f5' }}>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>URL</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Tenant</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Reasons</th>
              <th style={{ padding: '12px', border: '1px solid #ddd', textAlign: 'left' }}>Reported At</th>
            </tr>
          </thead>
          <tbody>
            {filteredReports.map((report, index) => (
              <tr key={report.id || index} style={{ borderBottom: '1px solid #ddd' }}>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  <a href={report.url} target="_blank" rel="noopener noreferrer" style={{ color: '#0066cc' }}>
                    {report.url}
                  </a>
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>{report.tenantKey || '—'}</td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  {(report.reasons || []).slice(0, 4).map((r, i) => (
                    <span key={i} style={{ 
                      background: '#e0e0e0', 
                      padding: '2px 6px', 
                      borderRadius: '3px', 
                      fontSize: '0.8em', 
                      margin: '2px',
                      display: 'inline-block'
                    }}>
                      {r}
                    </span>
                  ))}
                </td>
                <td style={{ padding: '12px', border: '1px solid #ddd' }}>
                  {new Date(report.reportedAt).toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredReports.length === 0 && (
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          No reports found matching your criteria.
        </div>
      )}

      {/* Tenant Breakdown */}
      {summary && summary.tenantBreakdown && (
        <div style={{ marginTop: '40px' }}>
          <h2>Tenant Breakdown</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px' }}>
            {Object.entries(summary.tenantBreakdown).map(([tenant, count]) => (
              <div key={tenant} style={{ background: '#f0f0f0', padding: '20px', borderRadius: '8px', textAlign: 'center' }}>
                <h3>{tenant}</h3>
                <div style={{ fontSize: '1.5em', fontWeight: 'bold' }}>{count}</div>
                <div style={{ fontSize: '0.9em', color: '#666' }}>reports</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
