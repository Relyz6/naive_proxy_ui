import { useCallback, useState } from "react";

export type Toast = {
  id: number;
  text: string;
  type: "success" | "error";
};

export function useToast() {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const push = useCallback((text: string, type: Toast["type"] = "success") => {
    const id = Date.now();

    setToasts((t) => [...t, { id, text, type }]);

    setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 2500);
  }, []);

  return { toasts, push };
}
