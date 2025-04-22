import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { useLocation } from 'react-router-dom';
import { toast, ToastContainer } from 'react-toastify';
import 'react-toastify/dist/ReactToastify.css';
import '../admin.css';


function ViewCategories() {
  const [categories, setCategories] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editTypes, setEditTypes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [categoriesPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [sortOption, setSortOption] = useState('alphabetical-asc');
  const tableRef = useRef(null);
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/categories`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setCategories(res.data);
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to fetch categories');
      }
    };
    fetchCategories();
  }, []);

  // Handle search and suggestions
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search

    if (query.length >= 2) {
      const lowerQuery = query.toLowerCase();
      const suggestionSet = new Set();

      // Collect suggestions from name, description, and type names
      categories.forEach(category => {
        if (category.name.toLowerCase().includes(lowerQuery)) {
          suggestionSet.add(`Name: ${category.name}`);
        }
        if (category.description?.toLowerCase().includes(lowerQuery)) {
          suggestionSet.add(`Description: ${category.description}`);
        }
        category.types.forEach(type => {
          if (type.name.toLowerCase().includes(lowerQuery)) {
            suggestionSet.add(`Type: ${type.name}`);
          }
        });
      });

      // Limit to 5 suggestions per field
      const suggestionArray = Array.from(suggestionSet).slice(0, 15);
      setSuggestions(suggestionArray);
      setShowSuggestions(true);
      setHighlightedIndex(-1);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    const query = suggestion.split(': ')[1];
    setSearchQuery(query);
    setShowSuggestions(false);
    setHighlightedIndex(-1);
    setCurrentPage(1);
    searchInputRef.current.focus();
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setHighlightedIndex(prev => (prev > 0 ? prev - 1 : -1));
    } else if (e.key === 'Enter' && highlightedIndex >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[highlightedIndex]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
      setHighlightedIndex(-1);
    }
  };

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [suggestions, highlightedIndex, showSuggestions]);

  // Click outside to close suggestions
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(e.target)
      ) {
        setShowSuggestions(false);
        setHighlightedIndex(-1);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter categories based on search query
  const filteredCategories = categories.filter(category => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      category.name.toLowerCase().includes(lowerQuery) ||
      (category.description?.toLowerCase().includes(lowerQuery)) ||
      category.types.some(type => type.name.toLowerCase().includes(lowerQuery))
    );
  });

  // Sort categories based on sortOption
  const sortedCategories = [...filteredCategories].sort((a, b) => {
    switch (sortOption) {
      case 'alphabetical-asc':
        return a.name.localeCompare(b.name);
      case 'alphabetical-desc':
        return b.name.localeCompare(a.name);
      case 'newest':
        return new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt);
      case 'oldest':
        return new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt);
      default:
        return 0;
    }
  });

  // Handle pagination and scrolling for new category
  useEffect(() => {
    const query = new URLSearchParams(location.search);
    const newCategory = query.get('newCategory') === 'true';
    const categoryId = query.get('categoryId');

    if (newCategory && categoryId && categories.length > 0) {
      const categoryIndex = sortedCategories.findIndex(cat => cat._id === categoryId);
      if (categoryIndex !== -1) {
        const targetPage = Math.floor(categoryIndex / categoriesPerPage) + 1;
        setCurrentPage(targetPage);

        setTimeout(() => {
          const categoryRow = document.querySelector(`tr[data-category-id="${categoryId}"]`);
          if (categoryRow) {
            categoryRow.scrollIntoView({ behavior: 'smooth', block: 'center' });
          } else if (tableRef.current) {
            tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
          }
        }, 100);
      }
    } else if (newCategory && tableRef.current) {
      tableRef.current.scrollIntoView({ behavior: 'smooth', block: 'end' });
    }
  }, [categories, location.search, categoriesPerPage, sortedCategories]);

  // Pagination logic
  const indexOfLastCategory = currentPage * categoriesPerPage;
  const indexOfFirstCategory = indexOfLastCategory - categoriesPerPage;
  const currentCategories = sortedCategories.slice(indexOfFirstCategory, indexOfLastCategory);
  const totalPages = Math.ceil(sortedCategories.length / categoriesPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this category?')) return;
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/categories/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setCategories(categories.filter(cat => cat._id !== id));
      toast.success('Category deleted successfully!');
      if (currentCategories.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to delete category');
    }
  };

  const handleEdit = (category) => {
    setEditingId(category._id);
    setEditName(category.name);
    setEditDescription(category.description || '');
    setEditTypes([...category.types]);
  };

  const handleUpdate = async (id) => {
    let hasError = false;

    if (!editName.trim()) {
      toast.error('Category name is required');
      hasError = true;
    }

    if (!editDescription.trim()) {
      toast.error('Category description is required');
      hasError = true;
    }

    editTypes.forEach((type, index) => {
      if (!type.name.trim()) {
        toast.error(`Type name is required for type ${index + 1}`);
        hasError = true;
      }
      if (!type.description.trim()) {
        toast.error(`Type description is required for type ${index + 1}`);
        hasError = true;
      }
    });

    if (hasError) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.put(
        `${import.meta.env.VITE_API_URL}/categories/${id}`,
        { name: editName, description: editDescription, types: editTypes },
        {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        }
      );
      setCategories(categories.map(cat => (cat._id === id ? res.data : cat)));
      setEditingId(null);
      toast.success('Category updated successfully!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update category');
    }
  };

  const handleTypeChange = (index, field, value) => {
    const updatedTypes = [...editTypes];
    updatedTypes[index][field] = value;
    setEditTypes(updatedTypes);
  };

  const addType = () => {
    setEditTypes([...editTypes, { name: '', description: '' }]);
  };

  const removeType = async (categoryId, typeId, index) => {
    if (typeId) {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.delete(
          `${import.meta.env.VITE_API_URL}/categories/${categoryId}/types/${typeId}`,
          {
            headers: { Authorization: `Bearer ${token}` },
            withCredentials: true,
          }
        );
        setCategories(categories.map(cat => (cat._id === categoryId ? res.data : cat)));
        setEditTypes(editTypes.filter((_, i) => i !== index));
      } catch (err) {
        toast.error(err.response?.data?.message || 'Failed to delete type');
      }
    } else {
      setEditTypes(editTypes.filter((_, i) => i !== index));
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Manage Categories</h2>
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
      <div className="search-sort-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
        <div className="search-container" style={{ position: 'relative', flex: '1' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by name, description, or type..."
            value={searchQuery}
            onChange={handleSearchChange}
            ref={searchInputRef}
            aria-label="Search categories"
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="suggestions-list" ref={suggestionsRef}>
              {suggestions.map((suggestion, index) => (
                <li
                  key={index}
                  className={`suggestion-item ${index === highlightedIndex ? 'highlighted' : ''}`}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseEnter={() => setHighlightedIndex(index)}
                >
                  {suggestion}
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="sort-container">
          <select
            className="form-control"
            value={sortOption}
            onChange={(e) => {
              setSortOption(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Sort categories"
          >
            <option value="alphabetical-asc">Alphabetical (A-Z)</option>
            <option value="alphabetical-desc">Alphabetical (Z-A)</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>
      {sortedCategories.length === 0 ? (
        <p>No categories found.</p>
      ) : (
        <>
          <table className="data-table" ref={tableRef}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Description</th>
                <th>Types</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentCategories.map(category => (
                <tr key={category._id} data-category-id={category._id}>
                  {editingId === category._id ? (
                    <>
                      <td>
                        <input
                          className="form-control"
                          type="text"
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          placeholder="Enter category name"
                          required
                        />
                      </td>
                      <td>
                        <textarea
                          className="form-control"
                          value={editDescription}
                          onChange={(e) => setEditDescription(e.target.value)}
                          placeholder="Enter category description"
                          rows="2"
                          required
                        />
                      </td>
                      <td>
                        {editTypes.map((type, index) => (
                          <div key={type._id || index} className="type-input-group" style={{ marginBottom: '10px' }}>
                            <input
                              className="form-control"
                              type="text"
                              value={type.name}
                              onChange={(e) => handleTypeChange(index, 'name', e.target.value)}
                              placeholder={`Type Name ${index + 1}`}
                              style={{ marginBottom: '5px' }}
                              required
                            />
                            <textarea
                              className="form-control"
                              value={type.description || ''}
                              onChange={(e) => handleTypeChange(index, 'description', e.target.value)}
                              placeholder={`Type Description ${index + 1}`}
                              rows="2"
                              required
                            />
                            <button
                              className="btn btn-danger"
                              onClick={() => removeType(category._id, type._id, index)}
                              style={{ marginTop: '5px' }}
                            >
                              Remove
                            </button>
                          </div>
                        ))}
                        <button
                          className="btn btn-secondary"
                          onClick={addType}
                          style={{ marginTop: '10px' }}
                        >
                          Add Type
                        </button>
                      </td>
                      <td>
                        <div className="form-group" style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-success" onClick={() => handleUpdate(category._id)}>
                            Update
                          </button>
                          <button className="btn btn-warning" onClick={() => setEditingId(null)}>
                            Cancel
                          </button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td>{category.name}</td>
                      <td>{category.description}</td>
                      <td>
                        {category.types.length > 0 ? (
                          <ul>
                            {category.types.map(type => (
                              <li key={type._id}>
                                {type.name} - {type.description || 'No description'}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          'No types'
                        )}
                      </td>
                      <td>
                        <div className="form-group" style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary" onClick={() => handleEdit(category)}>
                            Edit
                          </button>
                          <button className="btn btn-danger" onClick={() => handleDelete(category._id)}>
                            Delete
                          </button>
                        </div>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>

          <div className="pagination" style={{ marginTop: '20px', display: 'flex', justifyContent: 'center', gap: '10px' }}>
            <button
              className="btn btn-secondary"
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
            >
              Previous
            </button>
            {Array.from({ length: totalPages }, (_, index) => (
              <button
                key={index + 1}
                className={`btn ${currentPage === index + 1 ? 'btn-primary' : 'btn-secondary'}`}
                onClick={() => paginate(index + 1)}
              >
                {index + 1}
              </button>
            ))}
            <button
              className="btn btn-secondary"
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              Next
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default ViewCategories;