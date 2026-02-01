// Vercel serverless function to generate meta tags for social media previews
export default async function handler(req, res) {
  const { path } = req.query;
  
  // Extract token ID from path (e.g., /live/ID or /coin/ID)
  let tokenId = null;
  if (path) {
    const pathParts = path.split('/');
    if (pathParts.includes('live') || pathParts.includes('coin')) {
      const index = pathParts.findIndex(p => p === 'live' || p === 'coin');
      if (index >= 0 && pathParts[index + 1]) {
        tokenId = pathParts[index + 1];
      }
    } else if (pathParts.length > 0 && pathParts[pathParts.length - 1]) {
      // Try last part as token ID
      tokenId = pathParts[pathParts.length - 1];
    }
  }
  
  // Remove 'pump' suffix if present
  if (tokenId && tokenId.endsWith('pump')) {
    tokenId = tokenId.slice(0, -4);
  }
  
  // Default values
  let coinName = 'Pump';
  let symbol = '';
  let description = 'Pump allows anyone to create coins. All coins created on Pump are fair-launch, meaning everyone has equal access to buy and sell when the coin is first created.';
  let imageUrl = `${req.headers.host || 'localhost:3000'}/pump1.svg`;
  
  // If we have a token ID, try to fetch data
  if (tokenId) {
    try {
      // Try to fetch from pump.fun via proxy
      const proxyUrl = `http://localhost:3001/?url=${encodeURIComponent(`https://pump.fun/coin/${tokenId}pump`)}`;
      const response = await fetch(proxyUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });
      
      if (response.ok) {
        const html = await response.text();
        const titleMatch = html.match(/<title>(.+?)<\/title>/i);
        if (titleMatch) {
          const titleText = titleMatch[1];
          const nameMatch = titleText.match(/(.+?)\s*\(([^)]+)\)/);
          if (nameMatch) {
            coinName = nameMatch[1].trim();
            symbol = nameMatch[2].trim();
          }
        }
        
        // Use images.pump.fun for image
        imageUrl = `https://images.pump.fun/coin-image/${tokenId}pump?variant=86x86`;
      }
    } catch (error) {
      // Fallback to default values
      console.error('Error fetching token data:', error);
    }
  }
  
  // Generate HTML with proper meta tags
  const currentUrl = `https://${req.headers.host || 'localhost:3000'}${path || ''}`;
  const title = tokenId ? `${coinName} (${symbol}) - Pump` : 'Pump - Create and trade coins';
  
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${currentUrl}">
  <meta property="og:title" content="${title}">
  <meta property="og:description" content="${description}">
  <meta property="og:image" content="${imageUrl.startsWith('http') ? imageUrl : `https://${imageUrl}`}">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${currentUrl}">
  <meta name="twitter:title" content="${title}">
  <meta name="twitter:description" content="${description}">
  <meta name="twitter:image" content="${imageUrl.startsWith('http') ? imageUrl : `https://${imageUrl}`}">
  
  <script>
    window.location.href = '/${path || ''}';
  </script>
</head>
<body>
  <p>Redirecting...</p>
</body>
</html>`;
  
  res.setHeader('Content-Type', 'text/html');
  res.status(200).send(html);
}
