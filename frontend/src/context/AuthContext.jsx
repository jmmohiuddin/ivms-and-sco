import { createContext, useContext, useState, useEffect } from 'react'
import { 
  auth, 
  onAuthStateChanged, 
  loginUser, 
  registerUser, 
  logoutUser,
  loginWithGoogle,
  resetPassword 
} from '../config/firebase'

const AuthContext = createContext(null)

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [userRole, setUserRole] = useState(null)

  useEffect(() => {
    // Listen for Firebase auth state changes
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        // Convert Firebase user to app user format
        const appUser = {
          uid: firebaseUser.uid,
          email: firebaseUser.email,
          displayName: firebaseUser.displayName || firebaseUser.email.split('@')[0],
          photoURL: firebaseUser.photoURL,
          emailVerified: firebaseUser.emailVerified
        }
        setUser(appUser)
        
        // Determine user role (you can fetch this from backend or Firestore)
        const email = firebaseUser.email
        if (email.includes('@admin')) {
          setUserRole('admin')
          appUser.role = 'admin'
        } else if (email.includes('@vendor')) {
          setUserRole('vendor')
          appUser.role = 'vendor'
        } else {
          setUserRole('user')
          appUser.role = 'user'
        }
        setUser(appUser)
      } else {
        // No Firebase user - check if we're in development mode
        const isDevelopment = import.meta.env.MODE === 'development' || process.env.NODE_ENV === 'development'
        
        if (isDevelopment) {
          // Set mock user for development when no one is logged in
          setUser({
            uid: 'dev-user-123',
            email: 'admin@ivms.com',
            displayName: 'Admin User',
            photoURL: null,
            emailVerified: true,
            role: 'admin'
          })
          setUserRole('admin')
        } else {
          setUser(null)
          setUserRole(null)
        }
      }
      setLoading(false)
    })

    return unsubscribe
  }, [])

  const login = async (email, password) => {
    const result = await loginUser(email, password)
    if (!result.success) {
      throw new Error(result.error || 'Login failed')
    }
    return result.user
  }

  const loginGoogle = async () => {
    const result = await loginWithGoogle()
    if (!result.success) {
      throw new Error(result.error || 'Google login failed')
    }
    return result.user
  }

  const register = async ({ email, password, name }) => {
    const result = await registerUser(email, password, name)
    if (!result.success) {
      throw new Error(result.error || 'Registration failed')
    }
    return result.user
  }

  const logout = async () => {
    const result = await logoutUser()
    if (!result.success) {
      throw new Error(result.error || 'Logout failed')
    }
  }

  const forgotPassword = async (email) => {
    const result = await resetPassword(email)
    if (!result.success) {
      throw new Error(result.error || 'Password reset failed')
    }
    return result
  }

  return (
    <AuthContext.Provider value={{ 
      user, 
      loading, 
      login, 
      loginGoogle,
      register, 
      logout,
      forgotPassword,
      userRole,
      isAdmin: userRole === 'admin',
      isVendor: userRole === 'vendor'
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
