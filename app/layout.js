import './globals.css';

export const metadata = {
  title: '우리아이들 1·2학기 성장보고서',
  description: '7월과 10월 관찰일지를 넣으면 AI가 아이의 발달 변화를 정리해 4쪽 성장 보고서를 만들어 드려요',
};

export default function RootLayout({ children }) {
  return (
    <html lang="ko">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Gowun+Batang:wght@400;700&family=Gowun+Dodum&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
