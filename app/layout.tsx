export const metadata = {
  title: "Brain4Design",
  description: "Flyer + Newsletter idea generator"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
