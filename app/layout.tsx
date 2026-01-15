export const metadata = {
  title: '安指 say_nail 預約系統',
  description: '專業美甲預約',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="zh-TW">
      <body>{children}</body>
    </html>
  )
}