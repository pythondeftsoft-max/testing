import { createContext, useContext, PropsWithChildren } from "react";
import { usePropertyImport as usePropertyImportImpl } from "@/hooks/usePropertyImport";

type ImportContextType = ReturnType<typeof usePropertyImportImpl>;

const ImportContext = createContext<ImportContextType | null>(null);

export function ImportProvider({ children }: PropsWithChildren) {
  const value = usePropertyImportImpl(); // ONE instance for the entire import flow
  return (
    <ImportContext.Provider value={value}>
      {children}
    </ImportContext.Provider>
  );
}

export function usePropertyImport() {
  const context = useContext(ImportContext);
  if (!context) {
    throw new Error("usePropertyImport must be used within an ImportProvider");
  }
  return context;
}