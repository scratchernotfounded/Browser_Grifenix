// api/proxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = async (req, res) => {
  // Tenta extrair a URL de destino da query string se existir (método mais seguro)
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
    rejectUnauthorized: false, // Ignora erros de certificado (tentativa anterior)

    onProxyReq: (proxyReq) => {
      // Configura User-Agent para evitar bloqueios
      proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
      
      // Adiciona host header para o target (ajuda a evitar erros 403 e 500)
      try {
        const targetHost = new URL(targetUrl).host;
        proxyReq.setHeader('Host', targetHost);
      } catch (e) {
        // Ignora se a URL for malformada aqui, pois a verificação inicial já ocorreu
      }
    },
    onError: (err, req, res) => {
      // Esta é a mensagem de erro que você está vendo
      res.writeHead(500, { 'Content-Type': 'text/plain' });
      res.end('Erro Crítico: Não foi possível estabelecer conexão com o site de destino. Tente outra URL.');
    },
  });

  apiProxy(req, res);
};
