import { useState, useEffect } from "react";

export function useIsPhone() {
  const [isPhone, setIsPhone] = useState(false);
  useEffect(() => {
    const update = () => setIsPhone(window.innerWidth < 640);
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, []);
  return isPhone;
}
