import React from 'react';
import { Navigate } from 'react-router-dom';

const PrivateRoute = ({ element: Element, ...rest }) => {
    return localStorage.getItem('access') ? (
        <Element {...rest} />
    ) : (
        <Navigate to="/sign_in" />
    );
};

export default PrivateRoute;