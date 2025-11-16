// api/proxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = async (req, res) => {
  let targetUrl = req.url.substring(1); 

  if (!targetUrl || !targetUrl.startsWith('http')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('A URL de destino é inválida ou não foi fornecida (Ex: https://site.com).');
    return;
  }

  const apiProxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: { '^/.*$': '' }, 
    
    // Configurações de conexão para máxima compatibilidade:
    secure: true, 
    followRedirects: true,
    rejectUnauthorized: false, 

    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
      
      try {
        const targetHost = new URL(targetUrl).host;
        proxyReq.setHeader('Host', targetHost);
      } catch (e) { }
    },
    
    // BLOCO ONERROR REMOVIDO AQUI!
    
  });

  apiProxy(req, res);
};
