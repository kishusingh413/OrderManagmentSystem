import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(value ?? 0),
  );
}

function formatDate(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export default function Orders() {
  const { showNotification } = useNotification();
  const [orders, setOrders] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [customerId, setCustomerId] = useState('');
  const [items, setItems] = useState([{ product_id: '', quantity: '1' }]);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadData = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const [ordersData, customersData, productsData] = await Promise.all([
        api.getOrders(),
        api.getCustomers(),
        api.getProducts(),
      ]);
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setCustomers(Array.isArray(customersData) ? customersData : []);
      setProducts(Array.isArray(productsData) ? productsData : []);
    } catch (err) {
      setError(err.message ?? 'Failed to load orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const estimatedTotal = useMemo(() => {
    return items.reduce((sum, item) => {
      const product = products.find((p) => String(p.id) === String(item.product_id));
      const quantity = Number(item.quantity ?? 0);
      if (!product || quantity <= 0) return sum;
      return sum + Number(product.price) * quantity;
    }, 0);
  }, [items, products]);

  const openCreateModal = () => {
    setCustomerId('');
    setItems([{ product_id: '', quantity: '1' }]);
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setCustomerId('');
    setItems([{ product_id: '', quantity: '1' }]);
    setFormErrors({});
  };

  const updateItem = (index, field, value) => {
    setItems((prev) =>
      prev.map((item, idx) => (idx === index ? { ...item, [field]: value } : item)),
    );
    setFormErrors((prev) => ({ ...prev, items: undefined }));
  };

  const addItemRow = () => {
    setItems((prev) => [...prev, { product_id: '', quantity: '1' }]);
  };

  const removeItemRow = (index) => {
    setItems((prev) => (prev.length === 1 ? prev : prev.filter((_, idx) => idx !== index)));
  };

  const validateOrderForm = () => {
    const errors = {};
    if (!customerId) errors.customerId = 'Select a customer.';
    const validItems = items.filter((item) => item.product_id && Number(item.quantity) > 0);
    if (validItems.length === 0) {
      errors.items = 'Add at least one product with quantity greater than 0.';
    }
    const productIds = validItems.map((item) => item.product_id);
    if (productIds.length !== new Set(productIds).size) {
      errors.items = 'Each product can only appear once per order.';
    }
    return errors;
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateOrderForm();
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await api.createOrder({
        customer_id: Number(customerId),
        items: items
          .filter((item) => item.product_id && Number(item.quantity) > 0)
          .map((item) => ({
            product_id: Number(item.product_id),
            quantity: Number(item.quantity),
          })),
      });
      showNotification('Order created successfully.');
      closeModal();
      await loadData();
    } catch (err) {
      showNotification(err.message ?? 'Failed to create order.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (order) => {
    if (!window.confirm(`Cancel order #${order.id}? Inventory will be restored.`)) return;

    try {
      await api.deleteOrder(order.id);
      showNotification('Order cancelled successfully.');
      await loadData();
    } catch (err) {
      showNotification(err.message ?? 'Failed to cancel order.', 'error');
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2>Orders</h2>
          <p>Create and track customer orders.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          Create Order
        </button>
      </div>

      {loading && <div className="state-card">Loading orders...</div>}
      {!loading && error && (
        <div className="state-card state-error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={loadData}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="panel">
          {orders.length === 0 ? (
            <p className="empty-text">No orders yet. Create your first order.</p>
          ) : (
            <div className="table-wrap">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>Order #</th>
                    <th>Customer</th>
                    <th>Total</th>
                    <th>Created</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id}>
                      <td data-label="Order #">#{order.id}</td>
                      <td data-label="Customer">{order.customer_name}</td>
                      <td data-label="Total">{formatCurrency(order.total_amount)}</td>
                      <td data-label="Created" className="cell-wrap">
                        {formatDate(order.created_at)}
                      </td>
                      <td data-label="Actions" className="actions-cell">
                        <Link to={`/orders/${order.id}`} className="btn btn-small btn-secondary">
                          View
                        </Link>
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(order)}
                        >
                          Cancel
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {modalOpen && (
        <Modal title="Create Order" onClose={closeModal}>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Customer
              <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
                <option value="">Select customer</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.full_name} ({customer.email})
                  </option>
                ))}
              </select>
              {formErrors.customerId && (
                <span className="field-error">{formErrors.customerId}</span>
              )}
            </label>

            <div className="order-items-section">
              <div className="panel-header">
                <h3>Order Items</h3>
                <button type="button" className="btn btn-small btn-secondary" onClick={addItemRow}>
                  Add Item
                </button>
              </div>
              {items.map((item, index) => (
                <div key={`item-${index}`} className="order-item-row">
                  <label>
                    Product
                    <select
                      value={item.product_id}
                      onChange={(e) => updateItem(index, 'product_id', e.target.value)}
                    >
                      <option value="">Select product</option>
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} — {formatCurrency(product.price)} (stock:{' '}
                          {product.quantity_in_stock})
                        </option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Quantity
                    <input
                      type="number"
                      min="1"
                      step="1"
                      value={item.quantity}
                      onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                    />
                  </label>
                  {items.length > 1 && (
                    <button
                      type="button"
                      className="btn btn-small btn-danger order-item-remove"
                      onClick={() => removeItemRow(index)}
                    >
                      Remove
                    </button>
                  )}
                </div>
              ))}
              {formErrors.items && <span className="field-error">{formErrors.items}</span>}
            </div>

            <div className="order-total">
              <span>Estimated Total</span>
              <strong>{formatCurrency(estimatedTotal)}</strong>
            </div>

            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Creating...' : 'Create Order'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
