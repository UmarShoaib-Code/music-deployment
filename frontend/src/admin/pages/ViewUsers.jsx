import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import '../admin.css';


function ViewUsers() {
  const [users, setUsers] = useState([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const [sortOption, setSortOption] = useState('alphabetical-asc');
  const searchInputRef = useRef(null);
  const suggestionsRef = useRef(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem('token');
        const res = await axios.get(`${import.meta.env.VITE_API_URL}/users`, {
          headers: { Authorization: `Bearer ${token}` },
          withCredentials: true,
        });
        setUsers(res.data.filter(user => user.role !== 'admin'));
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to fetch users');
      }
    };
    fetchUsers();
  }, []);

  // Handle search and suggestions
  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    setCurrentPage(1); // Reset to first page on search

    if (query.length >= 2) {
      const lowerQuery = query.toLowerCase();
      const suggestionSet = new Set();

      // Collect suggestions from email and role
      users.forEach(user => {
        if (user.email.toLowerCase().includes(lowerQuery)) {
          suggestionSet.add(`Email: ${user.email}`);
        }
        if (user.role.toLowerCase().includes(lowerQuery)) {
          suggestionSet.add(`Role: ${user.role}`);
        }
      });

      // Limit to 10 suggestions
      const suggestionArray = Array.from(suggestionSet).slice(0, 10);
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

  // Filter users based on search query
  const filteredUsers = users.filter(user => {
    if (!searchQuery) return true;
    const lowerQuery = searchQuery.toLowerCase();
    return (
      user.email.toLowerCase().includes(lowerQuery) ||
      user.role.toLowerCase().includes(lowerQuery)
    );
  });

  // Sort users based on sortOption
  const sortedUsers = [...filteredUsers].sort((a, b) => {
    switch (sortOption) {
      case 'alphabetical-asc':
        return a.email.localeCompare(b.email);
      case 'alphabetical-desc':
        return b.email.localeCompare(a.email);
      case 'newest':
        return new Date(b.createdAt || b.updatedAt) - new Date(a.createdAt || a.updatedAt);
      case 'oldest':
        return new Date(a.createdAt || a.updatedAt) - new Date(b.createdAt || b.updatedAt);
      default:
        return 0;
    }
  });

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = sortedUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(sortedUsers.length / usersPerPage);

  const paginate = (pageNumber) => {
    if (pageNumber >= 1 && pageNumber <= totalPages) {
      setCurrentPage(pageNumber);
    }
  };

  const handleDelete = async (userId) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    
    try {
      const token = localStorage.getItem('token');
      await axios.delete(`${import.meta.env.VITE_API_URL}/users/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
        withCredentials: true,
      });
      setUsers(users.filter(user => user._id !== userId));
      setSuccess('User deleted successfully');
      setTimeout(() => setSuccess(''), 3000);
      if (currentUsers.length === 1 && currentPage > 1) {
        setCurrentPage(currentPage - 1);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
      setTimeout(() => setError(''), 3000);
    }
  };

  return (
    <div className="card">
      <h2 className="card-title">Manage Users</h2>
      {error && <div className="error-message">{error}</div>}
      {success && <div className="success-message">{success}</div>}

      <div className="search-sort-container" style={{ display: 'flex', gap: '20px', marginBottom: '20px', alignItems: 'center' }}>
        <div className="search-container" style={{ position: 'relative', flex: '1' }}>
          <input
            type="text"
            className="form-control"
            placeholder="Search by email or role..."
            value={searchQuery}
            onChange={handleSearchChange}
            ref={searchInputRef}
            aria-label="Search users"
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
            aria-label="Sort users"
          >
            <option value="alphabetical-asc">Alphabetical (A-Z)</option>
            <option value="alphabetical-desc">Alphabetical (Z-A)</option>
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
          </select>
        </div>
      </div>

      {sortedUsers.length === 0 ? (
        <p>No users found</p>
      ) : (
        <>
          <table className="data-table">
            <thead>
              <tr>
                <th>Email</th>
                <th>Role</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {currentUsers.map(user => (
                <tr key={user._id}>
                  <td>{user.email}</td>
                  <td>{user.role}</td>
                  <td>
                    <button
                      className="btn btn-danger"
                      onClick={() => handleDelete(user._id)}
                    >
                      Delete
                    </button>
                  </td>
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

export default ViewUsers;