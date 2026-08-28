// api/robots.js
export default function handler(req, res) {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  const protocol = req.headers['x-forwarded-proto'] || 'https';
  const siteUrl = `${protocol}://${req.headers.host}`;

  const robots = `
User-agent: *
Disallow:

Sitemap: ${siteUrl}/sitemap.xml
`;

  res.status(200).send(robots.trim());
}