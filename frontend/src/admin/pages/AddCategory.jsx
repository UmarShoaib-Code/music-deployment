import { useState } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../admin.css';

function AddCategory() {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [types, setTypes] = useState([{ name: '', description: '' }]);
  const navigate = useNavigate();

  const handleTypeChange = (index, field, value) => {
    const updatedTypes = [...types];
    updatedTypes[index][field] = value;
    setTypes(updatedTypes);
  };

  const addType = () => {
    setTypes([...types, { name: '', description: '' }]);
  };

  const removeType = (index) => {
    if (types.length > 1) {
      setTypes(types.filter((_, i) => i !== index));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validation
    let hasError = false;

    // Check category name
    if (!name.trim()) {
      toast.error('Category name is required');
      hasError = true;
    }

    // Check category description
    if (!description.trim()) {
      toast.error('Category description is required');
      hasError = true;
    }

    // Check category types
    types.forEach((type, index) => {
      if (!type.name.trim()) {
        toast.error(`Type name is required for type ${index + 1}`);
        hasError = true;
      }
      if (!type.description.trim()) {
        toast.error(`Type description is required for type ${index + 1}`);
        hasError = true;
      }
    });

    // Stop submission if there are errors
    if (hasError) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.post(
        `${import.meta.env.VITE_API_URL}/categories/create`,
        { 
          name, 
          description, 
          types: types.filter(type => type.name.trim() && type.description.trim())
        },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );

      toast.success('Category added successfully!');
      setName('');
      setDescription('');
      setTypes([{ name: '', description: '' }]);

      // Redirect to ViewCategories with query params including the new category ID
      setTimeout(() => {
        navigate(`/admin/view-categories?newCategory=true&categoryId=${res.data._id}`);
      }, 1000);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to add category');
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Add Category</h2>
      <ToastContainer 
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
      />
      
      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label">Category Name:</label>
          <input
            className="form-control"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter category name"
            required
          />
        </div>
        
        <div className="form-group">
          <label className="form-label">Category Description:</label>
          <textarea
            className="form-control"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter category description"
            rows="4"
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Category Types:</label>
          {types.map((type, index) => (
            <div key={index} className="type-input-group" style={{ marginBottom: '15px' }}>
              <input
                className="form-control"
                type="text"
                value={type.name}
                onChange={(e) => handleTypeChange(index, 'name', e.target.value)}
                placeholder={`Type Name ${index + 1}`}
                required
              />
              <textarea
                className="form-control"
                value={type.description}
                onChange={(e) => handleTypeChange(index, 'description', e.target.value)}
                placeholder={`Type Description ${index + 1}`}
                rows="2"
                required
              />
              {types.length > 1 && (
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => removeType(index)}
                  style={{ marginTop: '5px' }}
                >
                  Remove Type
                </button>
              )}
            </div>
          ))}
          <button
            type="button"
            className="btn btn-secondary"
            onClick={addType}
            style={{ marginTop: '10px' }}
          >
            Add Another Type
          </button>
        </div>
        
        <button type="submit" className="btn btn-primary">
          Add Category
        </button>
      </form>
    </div>
  );
}

export default AddCategory;