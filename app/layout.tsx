export const metadata = {
  title: "Expense Manager (NLP)",
  description: "Personal expense manager with natural language input",
};

import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container">
          <header className="header">
            <h1>Expense Manager</h1>
            <p className="subtitle">Type natural language to add and analyze expenses</p>
          </header>
          <main>{children}</main>
          <footer className="footer">Built for you</footer>
        </div>
      </body>
    </html>
  );
}
