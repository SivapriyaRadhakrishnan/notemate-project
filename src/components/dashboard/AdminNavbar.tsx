import { RoleNavbar } from "./role-shell";

const AdminNavbar = ({ onOpenSidebar = () => {} }: { onOpenSidebar?: () => void }) => (
  <RoleNavbar role="admin" onOpenSidebar={onOpenSidebar} />
);

export default AdminNavbar;
