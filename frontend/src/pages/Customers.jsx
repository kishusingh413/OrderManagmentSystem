import { useCallback, useEffect, useState } from 'react';
import { api } from '../api/client';
import Modal from '../components/Modal';
import { useNotification } from '../context/NotificationContext';

const emptyForm = {
  full_name: '',
  email: '',
  phone_number: '',
};

function validateCustomerForm(form) {
  const errors = {};
  if (!form.full_name.trim()) errors.full_name = 'Full name is required.';
  if (!form.email.trim()) {
    errors.email = 'Email is required.';
  } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
    errors.email = 'Enter a valid email address.';
  }
  if (!form.phone_number.trim()) errors.phone_number = 'Phone number is required.';
  return errors;
}

export default function Customers() {
  const { showNotification } = useNotification();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [formErrors, setFormErrors] = useState({});
  const [submitting, setSubmitting] = useState(false);

  const loadCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await api.getCustomers();
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err.message ?? 'Failed to load customers.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const openCreateModal = () => {
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const closeModal = () => {
    setModalOpen(false);
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
    const errors = validateCustomerForm(form);
    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setSubmitting(true);
    try {
      await api.createCustomer({
        full_name: form.full_name.trim(),
        email: form.email.trim(),
        phone_number: form.phone_number.trim(),
      });
      showNotification('Customer created successfully.');
      closeModal();
      await loadCustomers();
    } catch (err) {
      showNotification(err.message ?? 'Failed to create customer.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (customer) => {
    if (!window.confirm(`Delete customer "${customer.full_name}"?`)) return;

    try {
      await api.deleteCustomer(customer.id);
      showNotification('Customer deleted successfully.');
      await loadCustomers();
    } catch (err) {
      showNotification(err.message ?? 'Failed to delete customer.', 'error');
    }
  };

  return (
    <section className="page">
      <div className="page-header">
        <div>
          <h2>Customers</h2>
          <p>Manage customer records for order placement.</p>
        </div>
        <button type="button" className="btn btn-primary" onClick={openCreateModal}>
          Add Customer
        </button>
      </div>

      {loading && <div className="state-card">Loading customers...</div>}
      {!loading && error && (
        <div className="state-card state-error">
          <p>{error}</p>
          <button type="button" className="btn btn-secondary" onClick={loadCustomers}>
            Retry
          </button>
        </div>
      )}

      {!loading && !error && (
        <div className="panel">
          {customers.length === 0 ? (
            <p className="empty-text">No customers yet. Add your first customer.</p>
          ) : (
            <div className="table-wrap">
              <table className="responsive-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id}>
                      <td data-label="Name">{customer.full_name}</td>
                      <td data-label="Email" className="cell-wrap">
                        {customer.email}
                      </td>
                      <td data-label="Phone">{customer.phone_number}</td>
                      <td data-label="Actions" className="actions-cell">
                        <button
                          type="button"
                          className="btn btn-small btn-danger"
                          onClick={() => handleDelete(customer)}
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
        <Modal title="Add Customer" onClose={closeModal}>
          <form className="form-grid" onSubmit={handleSubmit}>
            <label>
              Full Name
              <input name="full_name" value={form.full_name} onChange={handleChange} />
              {formErrors.full_name && <span className="field-error">{formErrors.full_name}</span>}
            </label>
            <label>
              Email
              <input name="email" type="email" value={form.email} onChange={handleChange} />
              {formErrors.email && <span className="field-error">{formErrors.email}</span>}
            </label>
            <label>
              Phone Number
              <input name="phone_number" value={form.phone_number} onChange={handleChange} />
              {formErrors.phone_number && (
                <span className="field-error">{formErrors.phone_number}</span>
              )}
            </label>
            <div className="form-actions">
              <button type="button" className="btn btn-secondary" onClick={closeModal}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Saving...' : 'Create'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </section>
  );
}
