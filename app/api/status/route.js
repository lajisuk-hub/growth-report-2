// 앱 열림/닫힘 상태. Vercel 환경변수 APP_CLOSED=1 이면 닫힌 것으로 본다.
// 닫기: printf '1' | npx vercel@latest env add APP_CLOSED production  → npx vercel@latest deploy --prod --yes
// 열기: npx vercel@latest env rm APP_CLOSED production -y            → npx vercel@latest deploy --prod --yes
export const dynamic = 'force-dynamic';

export async function GET() {
  return Response.json({ closed: process.env.APP_CLOSED === '1' });
}
