import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';

function formatCurrency(value) {
  const amount = Number(value ?? 0);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(amount);
}

export default function Dashboard() {
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadSummary = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getDashboard();
      setSummary(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load dashboard.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  if (loading) {
    return <div className="state-card">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="state-card state-error">
        <p>{error}</p>
        <button type="button" className="btn btn-secondary" onClick={loadSummary}>
          Retry
        </button>
      </div>
    );
  }

  const stats = [
    { label: 'Total Products', value: summary?.total_products ?? 0 },
    { label: 'Total Customers', value: summary?.total_customers ?? 0 },
    { label: 'Total Orders', value: summary?.total_orders ?? 0 },
    {
      label: 'Low Stock Items',
      value: summary?.low_stock_products?.length ?? 0,
    },
  ];

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2>Dashboard</h2>
          <p>Overview of inventory and order activity.</p>
        </div>
        <button type="button" className="btn btn-secondary" onClick={loadSummary}>
          Refresh
        </button>
      </div>

      <div className="stats-grid">
        {stats.map((stat) => (
          <article key={stat.label} className="stat-card">
            <span>{stat.label}</span>
            <strong>{stat.value}</strong>
          </article>
        ))}
      </div>

      <section className="panel">
        <div className="panel-header">
          <h3>Low Stock Products</h3>
          <span className="badge">≤ 10 units</span>
        </div>
        {(summary?.low_stock_products?.length ?? 0) === 0 ? (
          <p className="empty-text">All products are well stocked.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Name</th>
                  <th>SKU</th>
                  <th>Price</th>
                  <th>In Stock</th>
                </tr>
              </thead>
              <tbody>
                {summary.low_stock_products.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td>{product.sku}</td>
                    <td>{formatCurrency(product.price)}</td>
                    <td>
                      <span className="badge badge-warning">{product.quantity_in_stock}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </section>
  );
}
