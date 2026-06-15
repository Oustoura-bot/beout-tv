// Minimal layout for /admin — individual sub-pages handle their own auth checks
// and render the AdminNav. This keeps /admin (login) clean of admin chrome.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
