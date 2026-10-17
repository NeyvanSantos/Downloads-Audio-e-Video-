import dns from 'dns/promises';
import net from 'net';

const invalid = (message: string) => Object.assign(new Error(message), { status: 400 });
export const validatePublicUrl = async (value: unknown): Promise<string> => {
  if (typeof value !== 'string' || value.length > 4096) throw invalid('Informe uma URL válida.');
  let url: URL;
  try { url = new URL(value); } catch { throw invalid('Informe uma URL válida.'); }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || (url.port && !['80', '443'].includes(url.port))) throw invalid('Use uma URL pública HTTP ou HTTPS sem credenciais e sem portas especiais.');
  const host = url.hostname.replace(/^\[|\]$/g, '');
  if (host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || !host.includes('.') || net.isIP(host)) throw invalid('Use um domínio público.');
  let addresses;
  try { addresses = await dns.lookup(host, { all: true }); } catch { throw invalid('Não foi possível encontrar o domínio.'); }
  const isPublic = (address: string) => {
    if (net.isIPv4(address)) {
      const [a, b] = address.split('.').map(Number);
      return !(a === 0 || a === 10 || a === 127 || a >= 224 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && (b === 168 || b === 0)) || (a === 100 && b >= 64 && b <= 127) || (a === 198 && (b === 18 || b === 19)));
    }
    return /^[23][0-9a-f]{3}:/i.test(address);
  };
  if (!addresses.length || addresses.some(entry => !isPublic(entry.address))) throw invalid('O endereço precisa ser público.');
  return url.toString();
};
export const validateTaskId = (id: string) => {
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) throw invalid('Identificador de download inválido.');
};
