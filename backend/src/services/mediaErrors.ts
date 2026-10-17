export class MediaError extends Error {
  constructor(
    public readonly code: string,
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'MediaError';
  }
}

export const describeMediaError = (error: unknown): MediaError => {
  if (error instanceof MediaError) return error;
  const failure = error as {
    stderr?: string;
    message?: string;
    killed?: boolean;
    code?: string;
  } | null;
  const details = `${failure?.stderr || ''}\n${failure?.message || ''}`;
  if (/429|too many requests/i.test(details))
    return new MediaError(
      'SOURCE_RATE_LIMITED',
      429,
      'O YouTube ou a fonte limitou as consultas desta conexão. Aguarde alguns minutos antes de tentar novamente.',
    );
  if (
    /not a bot|confirm you.re|sign in|login required|cookies for the authentication/i.test(
      details,
    )
  )
    return new MediaError(
      'SOURCE_LOGIN_REQUIRED',
      403,
      'O YouTube ou a fonte pediu confirmação no navegador. Este link não pôde ser acessado pela API sem uma sessão autorizada.',
    );
  if (
    /private video|video unavailable|not available|has been removed|unsupported url|not a valid url/i.test(
      details,
    )
  )
    return new MediaError(
      'MEDIA_UNAVAILABLE',
      422,
      'Este vídeo está indisponível, é privado ou não é compatível com o serviço.',
    );
  if (failure?.killed || /timed? ?out|timeout/i.test(details))
    return new MediaError(
      'SOURCE_TIMEOUT',
      504,
      'A fonte demorou para responder. Aguarde um pouco e tente novamente.',
    );
  if (failure?.code === 'ENOENT')
    return new MediaError(
      'PROCESSOR_UNAVAILABLE',
      503,
      'O processador de mídia não está disponível. Reinicie a API local.',
    );
  return new MediaError(
    'MEDIA_PROCESSING_FAILED',
    502,
    'Não foi possível ler ou processar este vídeo. Confira o link e tente novamente mais tarde.',
  );
};
