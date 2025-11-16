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
    // Definimos o target como uma URL base, o middleware lida com o resto
    target: targetUrl, 
    
    // Isso é essencial: informa ao proxy para usar o host do destino, não o do Vercel
    changeOrigin: true, 
    
    // Removemos a manipulação manual do Host Header, pois o changeOrigin deve ser suficiente:
    // **REMOVIDO: onProxyReq: (proxyReq) => { ... proxyReq.setHeader('Host', targetHost); ... }**

    pathRewrite: { '^/.*$': '' }, 
    
    // Configurações de conexão para máxima compatibilidade:
    secure: true, 
    followRedirects: true,
    rejectUnauthorized: false, 

    onProxyReq: (proxyReq) => {
      // Configura User-Agent
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    },
    
    // MANTEMOS O BLOCO ONERROR REMOVIDO PARA EVITAR MENSAGENS, FORÇANDO O TIMEOUT PADRÃO.
  });

  apiProxy(req, res);
};
