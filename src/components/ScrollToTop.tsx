import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const location = useLocation();

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && "scrollRestoration" in window.history) {
        window.history.scrollRestoration = "manual" as any;
      }
      window.scrollTo({ top: 0, left: 0, behavior: "auto" });
    } catch {}
  }, [location.pathname, location.search]);

  return null;
};

export default ScrollToTop;

