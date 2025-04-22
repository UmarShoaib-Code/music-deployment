import { Link } from 'react-router-dom';
import '../admin.css';

function Dashboard() {
  return (
    <div className="dashboard-grid">
      {/* Existing Categories Section */}
      <div className="manage-section">
        <h3>Manage Categories</h3>
        <div className="dashboard-grid">
          <Link to="/admin/add-category" className="module-card">
            <h4 className="module-title">Add Category</h4>
            <p className="module-description">Create a new category.</p>
          </Link>
          <Link to="/admin/view-categories" className="module-card">
            <h4 className="module-title">View Categories</h4>
            <p className="module-description">See all categories with options to update or delete.</p>
          </Link>
        </div>
      </div>

      {/* Existing Music Section */}
      <div className="manage-section">
        <h3>Manage Music</h3>
        <div className="dashboard-grid">
          <Link to="/admin/add-music" className="module-card">
            <h4 className="module-title">Add Music</h4>
            <p className="module-description">Upload new music.</p>
          </Link>
          <Link to="/admin/view-music" className="module-card">
            <h4 className="module-title">View Music</h4>
            <p className="module-description">See all music with options to update or delete.</p>
          </Link>
        </div>
      </div>

      {/* Updated Users Section */}
      <div className="manage-section">
        <h3>Manage Users</h3>
        <div className="dashboard-grid">
          <Link to="/admin/view-users" className="module-card">
            <h4 className="module-title">View Users</h4>
            <p className="module-description">View and manage all registered users.</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

export default Dashboard;