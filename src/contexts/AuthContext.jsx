import React, { createContext, useContext, useState, useEffect } from 'react';
import { auth, onAuthStateChanged } from '../config/firebase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
      
      // You can fetch user role from your backend here
      if (user) {
        // Example: Determine role based on email domain or fetch from backend
        const email = user.email;
        if (email.includes('@admin')) {
          setUserRole('admin');
        } else if (email.includes('@vendor')) {
          setUserRole('vendor');
        } else {
          setUserRole('user');
        }
      } else {
        setUserRole(null);
      }
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    userRole,
    isAuthenticated: !!currentUser,
    isAdmin: userRole === 'admin',
    isVendor: userRole === 'vendor'
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
