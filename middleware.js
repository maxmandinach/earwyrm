import { createClient } from '@supabase/supabase-js';

export const config = {
  matcher: '/s/:token*',
};

const CRAWLER_UA = /iMessageRichPreview|facebookexternalhit|Facebot|Twitterbot|LinkedInBot|Slackbot|Discordbot|WhatsApp|TelegramBot|bot|crawler|spider|curl/i;

export default async function middleware(req) {
  const ua = req.headers.get('user-agent') || '';

  // Only intercept crawlers — let browsers through to the React SPA
  if (!CRAWLER_UA.test(ua)) {
    return;
  }

  const url = new URL(req.url);
  const token = url.pathname.split('/s/')[1]?.split('/')[0]?.split('?')[0];

  if (!token) return;

  try {
    const supabase = createClient(
      process.env.VITE_SUPABASE_URL,
      process.env.VITE_SUPABASE_ANON_KEY
    );

    const { data: lyric, error } = await supabase
      .from('lyrics')
      .select('content, song_title, artist_name, cover_art_url')
      .eq('share_token', token)
      .single();

    if (error || !lyric) return;

    const title = [lyric.song_title, lyric.artist_name]
      .filter(Boolean)
      .join(' — ');

    const description = lyric.content.length > 160
      ? lyric.content.substring(0, 160) + '...'
      : lyric.content;

    const ogTitle = title || 'a lyric on earwyrm';
    const ogImage = `${url.origin}/api/og/${token}`;
    const ogUrl = `${url.origin}/s/${token}`;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <title>${escapeHtml(ogTitle)} — earwyrm</title>
  <meta name="description" content="${escapeHtml(description)}" />
  <meta property="og:type" content="website" />
  <meta property="og:title" content="${escapeHtml(ogTitle)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${ogImage}" />
  <meta property="og:image:width" content="1200" />
  <meta property="og:image:height" content="630" />
  <meta property="og:url" content="${ogUrl}" />
  <meta property="og:site_name" content="earwyrm" />
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(ogTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${ogImage}" />
</head>
<body></body>
</html>`;

    return new Response(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      },
    });
  } catch (e) {
    // On error, fall through to SPA
    return;
  }
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
