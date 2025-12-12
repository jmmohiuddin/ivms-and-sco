import { useAuth } from '../context/AuthContext'
import { FaBell, FaUserCircle, FaUserPlus } from 'react-icons/fa'
import { Link } from 'react-router-dom'

const Header = () => {
  const { user, logout } = useAuth()

  return (
    <header className="bg-white shadow-sm">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex items-center">
          <h1 className="text-2xl font-semibold text-gray-800">
            Welcome, {user?.displayName || user?.email?.split('@')[0] || 'User'}
          </h1>
        </div>

        <div className="flex items-center space-x-4">
          {/* Vendor Onboarding Button */}
          <Link
            to="/vendors/onboarding"
            className="flex items-center space-x-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
          >
            <FaUserPlus className="w-4 h-4" />
            <span className="text-sm font-medium">Vendor Onboarding</span>
          </Link>

          <button className="text-gray-600 hover:text-gray-800 relative">
            <FaBell className="w-6 h-6" />
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
              3
            </span>
          </button>

          <div className="relative group">
            <button className="flex items-center space-x-2 text-gray-700 hover:text-gray-900">
              <FaUserCircle className="w-8 h-8" />
              <span className="font-medium">{user?.role || 'Admin'}</span>
            </button>
            
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg py-1 hidden group-hover:block z-10">
              <div className="px-4 py-2 text-sm text-gray-700 border-b">
                <p className="font-medium">{user?.displayName || user?.email?.split('@')[0]}</p>
                <p className="text-gray-500">{user?.email}</p>
              </div>
              <button
                onClick={logout}
                className="block w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}

export default Header
