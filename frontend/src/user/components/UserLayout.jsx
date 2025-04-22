import { Outlet, Link, useNavigate } from 'react-router-dom';
import '../user.css';

function UserLayout() {
  const navigate = useNavigate();

  const handleLoginRedirect = () => {
    navigate('/login');
  };

  return (
    <div>
      <nav>
        <h1>User Panel</h1>
        <ul>
          <li>
            <button onClick={handleLoginRedirect}>Login</button>
          </li>
        </ul>
      </nav>
      <div className="user-content">
        <Outlet />
      </div>
    </div>
  );
}

export default UserLayout;