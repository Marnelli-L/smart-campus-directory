import Header from "./Header";
import Announcements from "./Announcements";
import LioButton from "./LioButton";

function Layout({ children }) {
  return (
    <div className="h-screen flex flex-col">
      <Header />
      <Announcements />
      <main className="flex-grow bg-gray-50">{children}</main>
      <LioButton />
    </div>
  );
}

export default Layout;
