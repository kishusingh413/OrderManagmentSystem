import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';

const emptyForm = {
  name: '',
  sku: '',
  price: '',
  quantity_in_stock: '0',
};

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(
    Number(value ?? 0),
  );
}

function validateProductForm(form, isEdit = false) {
  const errors = {};
  if (!form.name.trim()) errors.name = 'Product name is required.';
  if (!form.sku.trim()) errors.sku = 'SKU is required.';
  if (!form.price || Number(form.price) <= 0) errors.price = 'Price must be greater than 0.';
  if (form.quantity_in_stock === '' || Number(form.quantity_in_stock) < 0) {
    errors.quantity_in_stock = 'Quantity cannot be negative.';
  }
  return errors;
}

export default function Products() {
  const { showNotification } = useNotification();
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getProducts();
      setProducts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message ?? 'Failed to load products.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const openCreateModal = () => {
    setEditingProduct(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setForm({
      name: product.name ?? '',
      sku: product.sku ?? '',
      price: String(product.price ?? ''),
      quantity_in_stock: String(product.quantity_in_stock ?? 0),
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
    setEditingProduct(null);
    setForm(emptyForm);
    setFormErrors({});
  };

  const handleChange = (event) => {
    const { name, value } = event.target;
    setForm((prev) => ({ ...prev, [name]: value }));
    setFormErrors((prev) => ({ ...prev, [name]: undefined }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    const errors = validateProductForm(form, Boolean(editingProduct));
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.name.trim(),
        sku: form.sku.trim(),
        price: Number(form.price),
        quantity_in_stock: Number(form.quantity_in_stock),
      };

      if (editingProduct) {
        await api.updateProduct(editingProduct.id, payload);
        showNotification('Product updated successfully.');
      } else {
        await api.createProduct(payload);
        showNotification('Product created successfully.');
      }

      closeModal();
      await loadProducts();
    } catch (err) {
      showNotification(err.message ?? 'Failed to save product.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (product) => {
    if (!window.confirm(`Delete product "${product.name}"?`)) return;

    try {
      await api.deleteProduct(product.id);
      showNotification('Product deleted successfully.');
      await loadProducts();
    } catch (err) {
      showNotification(err.message ?? 'Failed to delete product.', 'error');
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2>Products</h2>
          <p>Manage catalog items and inventory levels.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          Add Product
        </button>
      </div>

      {loading && <div className="state-card">Loading products...</div>}
      {!loading && error && (
        <div className="state-card state-error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={loadProducts}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="panel">
          {products.length === 0 ? (
            <p className="empty-text">No products yet. Add your first product.</p>
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>SKU</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {products.map((product) => (
                    <tr key={product.id}>
                      <td>{product.name}</td>
                      <td>{product.sku}</td>
                      <td>{formatCurrency(product.price)}</td>
                      <td>{product.quantity_in_stock}</td>
                      <td className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-small btn-secondary"
                          onClick={() => openEditModal(product)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(product)}
                        >
                          Delete
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
        <Modal title={editingProduct ? 'Edit Product' : 'Add Product'} onClose={closeModal}>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Product Name
              <input name="name" value={form.name} onChange={handleChange} />
              {formErrors.name && <span className="field-error">{formErrors.name}</span>}
            </label>
            <label>
              SKU
              <input name="sku" value={form.sku} onChange={handleChange} />
              {formErrors.sku && <span className="field-error">{formErrors.sku}</span>}
            </label>
            <label>
              Price
              <input name="price" type="number" min="0.01" step="0.01" value={form.price} onChange={handleChange} />
              {formErrors.price && <span className="field-error">{formErrors.price}</span>}
            </label>
            <label>
              Quantity in Stock
              <input
                name="quantity_in_stock"
                type="number"
                min="0"
                step="1"
                value={form.quantity_in_stock}
                onChange={handleChange}
              />
              {formErrors.quantity_in_stock && (
                <span className="field-error">{formErrors.quantity_in_stock}</span>
              )}
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : editingProduct ? 'Update' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
