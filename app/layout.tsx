export const metadata = {
  title: 'PostMint — Turn Any Video Into Your Original Posts',
  description: 'AI-powered content repurposing for creators',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, background: '#060608', color: '#f0f0f5' }}>
        {children}
      </body>
    </html>
  );
}
