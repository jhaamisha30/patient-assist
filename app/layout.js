import "./globals.css";

export const metadata = {
  title: "Patient Assist",
  description: "Medical records management system",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
