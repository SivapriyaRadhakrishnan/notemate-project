import { RoleNavbar } from "./role-shell";

const WriterNavbar = ({ onOpenSidebar = () => {} }: { onOpenSidebar?: () => void }) => (
  <RoleNavbar role="writer" onOpenSidebar={onOpenSidebar} />
);

export default WriterNavbar;
