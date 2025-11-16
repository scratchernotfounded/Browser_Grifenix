// api/proxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = async (req, res) => {
  const targetUrl = req.url.substring(1); 

  if (!targetUrl.startsWith('http')) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const apiProxy = createProxyMiddleware({
    target: targetUrl,
    changeOrigin: true,
    pathRewrite: { '^/.*$': '' }, 
    
    // LINHAS NOVAS PARA CORRIGIR A CONEXÃO:
    secure: true, // Força a verificação HTTPS
    followRedirects: true, // Garante que a proxy siga redirecionamentos (importante para logins)

    onProxyReq: (proxyReq) => {
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
    },
    onError: (err, req, res) => {
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Erro ao conectar ao site de destino. Verifique a URL.');
    },
  });

  apiProxy(req, res);
};
