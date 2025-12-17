// utils/privateRoute.js
import React from "react";
import { useAuth } from "../Context/AuthContext";
import { Navigate } from "react-router-dom";

const PrivateRoute = ({ children }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ 
                display: 'flex', 
                justifyContent: 'center', 
                alignItems: 'center', 
                height: '100vh' 
            }}>
                <div className="loading-spinner"></div>
            </div>
        );
    }
    
    return user ? children : <Navigate to="/login" />;
};

export default PrivateRoute;