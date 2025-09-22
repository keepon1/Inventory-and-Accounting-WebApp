import { useEffect, useState } from "react";
import { Navigate } from "react-router-dom";
import api from "./components/api";

const PrivateRoute = ({ element: Element, ...rest }) => {
  const [loading, setLoading] = useState(true);
  const [isAuth, setIsAuth] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      try {
        await api.get("me");
        setIsAuth(true);
      } catch (err) {
        setIsAuth(false);
      } finally {
        setLoading(false);
      }
    };
    checkAuth();
  }, []);

  if (loading) return <div>Loading...</div>;

  return isAuth ? <Element {...rest} /> : <Navigate to="/sign_in" />;
};

export default PrivateRoute;
