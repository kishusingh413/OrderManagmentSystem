import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api/client';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(value ?? 0),
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'full',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function OrderDetail() {
  const { id } = useParams();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const loadOrder = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError('');
    try {
      const data = await api.getOrder(id);
      setOrder(data);
    } catch (err) {
      setError(err.message ?? 'Failed to load order details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadOrder();
  }, [loadOrder]);

  if (loading) {
    return <div className="state-card">Loading order details...</div>;
  }

  if (error) {
    return (
      <div className="state-card state-error">
        <p>{error}</p>
        <Link to="/orders" className="btn btn-secondary">
          Back to Orders
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="state-card state-error">
        <p>Order not found.</p>
        <Link to="/orders" className="btn btn-secondary">
          Back to Orders
        </Link>
      </div>
    );
  }

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2>Order #{order.id}</h2>
          <p>Detailed breakdown of this order.</p>
        </div>
        <Link to="/orders" className="btn btn-secondary">
          Back to Orders
        </Link>
      </div>

      <div className="detail-grid">
        <article className="panel">
          <h3>Customer</h3>
          <p>{order.customer_name ?? '—'}</p>
        </article>
        <article className="panel">
          <h3>Created</h3>
          <p>{formatDate(order.created_at)}</p>
        </article>
        <article className="panel">
          <h3>Total Amount</h3>
          <p className="total-highlight">{formatCurrency(order.total_amount)}</p>
        </article>
      </div>

      <div className="panel">
        <div className="panel-header">
          <h3>Line Items</h3>
        </div>
        {(order.items?.length ?? 0) === 0 ? (
          <p className="empty-text">No items in this order.</p>
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Unit Price</th>
                  <th>Quantity</th>
                  <th>Line Total</th>
                </tr>
              </thead>
              <tbody>
                {order.items.map((item) => (
                  <tr key={item.id}>
                    <td>{item.product_name}</td>
                    <td>{formatCurrency(item.unit_price)}</td>
                    <td>{item.quantity}</td>
                    <td>{formatCurrency(item.line_total)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}
