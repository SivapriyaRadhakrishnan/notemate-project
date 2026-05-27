import { RoleNavbar } from "./role-shell";

const CustomerNavbar = ({ onOpenSidebar = () => {} }: { onOpenSidebar?: () => void }) => (
  <RoleNavbar role="customer" onOpenSidebar={onOpenSidebar} />
);

export default CustomerNavbar;
