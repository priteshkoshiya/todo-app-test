import "./globals.css";

export const metadata = {
  title: "My Tasks — Todo App",
  description: "A simple todo app to manage your daily tasks",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="font-body bg-bg text-text antialiased">{children}</body>
    </html>
  );
}
