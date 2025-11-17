// api/proxy.js
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = async (req, res) => {
    // 1. Remove o caminho /api/proxy/ do início para isolar o link limpo (ex: example.com)
    // Usamos regex para garantir que funcione corretamente, ignorando o / inicial.
    let targetPath = req.url.replace(/^\/api\/proxy\//, ''); 

    if (!targetPath) {
        res.writeHead(400, { 'Content-Type': 'text/plain' });
        res.end('URL de destino não fornecida.');
        return;
    }

    // 2. Adiciona o protocolo HTTPS de volta (o que foi removido no cliente index.html)
    // Isso é essencial para que a conexão externa funcione.
    const targetUrl = `https://${targetPath}`; 

    // 3. Configura o Proxy Middleware
    const apiProxy = createProxyMiddleware({
        target: targetUrl,
        changeOrigin: true, // Essencial: usa o host do destino, não o do Vercel.
        
        // Remove o /api/proxy/ do destino para que o site carregue corretamente
        pathRewrite: { 
            [`^/api/proxy/${targetPath}`]: '' 
        }, 
        
        // Configurações para tentar resolver o timeout e erros de certificado do Vercel
        secure: true, 
        followRedirects: true,
        rejectUnauthorized: false, 

        onProxyReq: (proxyReq) => {
            // Adiciona User-Agent e corrige o Host Header para evitar bloqueios 403
            proxyReq.setHeader('User-Agent', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.127 Safari/537.36');
            try {
                const targetHost = new URL(targetUrl).host;
                proxyReq.setHeader('Host', targetHost);
            } catch (e) {
                // Ignora se a URL for malformada
            }
        },
        onError: (err, req, res) => {
            // Mensagem de erro que aparecerá se o problema de conectividade do Vercel persistir
            res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
            res.end('Erro Crítico: Não foi possível conectar ao site de destino. Isso pode ser devido a bloqueio do Vercel.');
        },
    });

    apiProxy(req, res);
};
