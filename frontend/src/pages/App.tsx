import React, { useEffect, useRef, useState } from "react";
import axios from "axios";
import { ZodError } from "zod";
import { apiConfigured, downloadService, VideoMetadata } from "../services/api";
import downloadSchema from "../types/validation";

type IconName =
  | "download"
  | "link"
  | "arrow"
  | "video"
  | "music"
  | "check"
  | "shield"
  | "sparkles"
  | "clipboard"
  | "clock";
const paths: Record<IconName, React.ReactNode> = {
  download: (
    <>
      <path d="M12 3v12m-5-5 5 5 5-5" />
      <path d="M5 15v5h14v-5" />
    </>
  ),
  link: (
    <>
      <path
        d="m10 13 4-4m-6 6-1 1a4.2 4.2 0 0 1-6-6l4-4a4.2 4.2 0 0 1 6 0m2 3 1-1a4.2 4.2 0 0 1 6 6l-4 4a4.2 4.2 0 0 1-6 0"
        transform="translate(1 1)"
      />
    </>
  ),
  arrow: <path d="M4 12h16m-6-6 6 6-6 6" />,
  video: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="4" />
      <path d="m10 9 5 3-5 3z" />
    </>
  ),
  music: (
    <>
      <path d="M9 17V6l11-2v11M9 10l11-2" />
      <ellipse cx="6" cy="18" rx="3" ry="2.5" />
      <ellipse cx="17" cy="16" rx="3" ry="2.5" />
    </>
  ),
  check: <path d="m5 12 4 4L19 6" />,
  shield: (
    <>
      <path d="m12 3 8 3v6c0 5-8 9-8 9s-8-4-8-9V6z" />
      <path d="m8 12 3 3 5-6" />
    </>
  ),
  sparkles: (
    <>
      <path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5z" />
      <path d="M20 2v4m-2-2h4" />
    </>
  ),
  clipboard: (
    <>
      <rect x="5" y="5" width="14" height="16" rx="3" />
      <rect x="9" y="2" width="6" height="5" rx="1.5" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </>
  ),
};
const Icon = ({ name, size = 20 }: { name: IconName; size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.7"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    {paths[name]}
  </svg>
);
const errorMessage = (error: unknown): string => {
  if (error instanceof ZodError)
    return error.issues[0]?.message || "Confira o link informado.";
  if (axios.isAxiosError(error))
    return (
      error.response?.data?.error ||
      "Não foi possível conectar. Confira se a API está ligada e tente novamente."
    );
  return error instanceof Error ? error.message : "Ocorreu um erro inesperado.";
};
const durationLabel = (duration: number) =>
  duration > 0
    ? `${Math.floor(duration / 60)}:${String(Math.floor(duration % 60)).padStart(2, "0")}`
    : "Duração não informada";

const App: React.FC = () => {
  const [url, setUrl] = useState("");
  const [format, setFormat] = useState<"video" | "audio">("video");
  const [quality, setQuality] = useState("1080p");
  const [metadata, setMetadata] = useState<VideoMetadata | null>(null);
  const [status, setStatus] = useState("");
  const [phase, setPhase] = useState<
    "idle" | "preview" | "download" | "done" | "error"
  >("idle");
  const [readyId, setReadyId] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout>>();
  const generation = useRef(0);
  const busy = useRef(false);
  const input = useRef<HTMLInputElement>(null);
  const loading = phase === "preview" || phase === "download";

  useEffect(
    () => () => {
      generation.current++;
      clearTimeout(timer.current);
    },
    [],
  );
  const requestData = () =>
    downloadSchema.parse({
      url: url.trim(),
      format,
      quality: format === "audio" ? "mp3" : quality,
    });
  const resetResult = () => {
    setMetadata(null);
    setStatus("");
    setReadyId(null);
    setPhase("idle");
  };
  const fetchPreview = async () => {
    if (busy.current || !apiConfigured) return;
    busy.current = true;
    setPhase("preview");
    setMetadata(null);
    setStatus("Buscando as informações do seu link...");
    setReadyId(null);
    try {
      setMetadata(await downloadService.getPreview(requestData().url));
      setStatus("");
      setPhase("idle");
    } catch (error) {
      setStatus(errorMessage(error));
      setPhase("error");
    } finally {
      busy.current = false;
    }
  };
  const checkStatus = async (id: string, token: number) => {
    try {
      const data = await downloadService.getStatus(id);
      if (generation.current !== token) return;
      if (data.status === "ready") {
        await downloadService.downloadFile(id);
        setReadyId(id);
        setPhase("done");
        setStatus(
          "Seu arquivo está pronto! O download foi enviado ao navegador.",
        );
      } else if (
        ["pending", "downloading", "converting"].includes(data.status)
      ) {
        setStatus(
          data.status === "pending"
            ? "Preparando o seu download..."
            : data.status === "converting"
              ? "Convertendo o áudio para MP3..."
              : "Processando seu arquivo. Isso pode levar alguns instantes.",
        );
        timer.current = setTimeout(() => void checkStatus(id, token), 2000);
        return;
      } else {
        setPhase("error");
        setStatus(
          data.message ||
            "Não foi possível processar este link. Tente novamente.",
        );
      }
    } catch (error) {
      if (generation.current !== token) return;
      setPhase("error");
      setStatus(errorMessage(error));
    }
    if (generation.current === token) busy.current = false;
  };
  const handleDownload = async () => {
    if (busy.current) return;
    busy.current = true;
    setPhase("download");
    setReadyId(null);
    setStatus("Preparando o seu download...");
    const token = ++generation.current;
    try {
      const response = await downloadService.startDownload(requestData());
      void checkStatus(response.taskId, token);
    } catch (error) {
      setStatus(errorMessage(error));
      setPhase("error");
      busy.current = false;
    }
  };
  const pasteLink = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text.trim());
      resetResult();
      input.current?.focus();
    } catch {
      input.current?.focus();
      setStatus(
        "Cole o link no campo usando Ctrl + V ou o menu do seu celular.",
      );
      setPhase("idle");
    }
  };

  return (
    <div className="site-shell">
      <header className="site-header content-width">
        <a
          className="brand"
          href={import.meta.env.BASE_URL}
          aria-label="Video Downloader, início"
        >
          <span className="brand-mark">
            <Icon name="download" size={24} />
          </span>
          <span>
            Video<span className="brand-light">Downloader</span>
            <small>SEU CONTEÚDO, COM VOCÊ.</small>
          </span>
        </a>
        <nav aria-label="Navegação principal">
          <a href="#como-funciona">
            Como funciona <Icon name="arrow" size={16} />
          </a>
          <span className="header-badge">
            <span />
            Simples. Do seu jeito.
          </span>
        </nav>
      </header>
      <main className="content-width">
        <section className="hero" aria-labelledby="page-title">
          <span className="eyebrow">
            <Icon name="sparkles" size={15} /> DO LINK PARA O SEU DISPOSITIVO
          </span>
          <h1 id="page-title">
            Dê o play.
            <br className="mobile-break" /> <span>Mesmo offline.</span>
          </h1>
          <p>
            Seus vídeos favoritos e suas músicas, sempre por perto.
            <br className="desktop-break" /> Cole o link, escolha o formato e
            leve com você.
          </p>
          <div className="hero-features">
            <span>
              <Icon name="check" size={15} /> Vídeos até 4K
            </span>
            <span>
              <Icon name="check" size={15} /> Áudio em MP3
            </span>
            <span>
              <Icon name="check" size={15} /> Sem instalar nada
            </span>
          </div>
        </section>

        <section className="download-workspace" aria-label="Preparar download">
          <div className="download-panel">
            <div className="panel-heading">
              <span className="section-label">VAMOS COMEÇAR</span>
              <span className="step-counter">
                {phase === "done" ? "03" : metadata ? "02" : "01"}{" "}
                <span>/ 03</span>
              </span>
            </div>
            <h2>O que vamos baixar hoje?</h2>
            <p className="panel-description">
              Um link é tudo que você precisa para começar.
            </p>
            {!apiConfigured && (
              <div className="notice notice-warning" role="status">
                Os downloads estão temporariamente indisponíveis. Tente
                novamente mais tarde.
              </div>
            )}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                if (metadata) void handleDownload();
                else void fetchPreview();
              }}
            >
              <label className="field-label" htmlFor="video-url">
                Link do vídeo
              </label>
              <div className="url-field">
                <Icon name="link" />
                <input
                  ref={input}
                  id="video-url"
                  type="url"
                  value={url}
                  disabled={loading}
                  onChange={(event) => {
                    setUrl(event.target.value);
                    resetResult();
                  }}
                  placeholder="Cole o link do vídeo aqui"
                  autoComplete="off"
                  required
                  aria-describedby="url-hint"
                />
                <button
                  type="button"
                  className="paste-button"
                  onClick={() => void pasteLink()}
                  disabled={loading}
                  aria-label="Colar link da área de transferência"
                >
                  <Icon name="clipboard" size={16} />
                  <span>Colar</span>
                </button>
              </div>
              <p className="field-hint" id="url-hint">
                YouTube e outras fontes compatíveis com o serviço.
              </p>
              <fieldset className="format-fieldset" disabled={loading}>
                <legend className="field-label">Escolha o formato</legend>
                <div className="format-options">
                  {(["video", "audio"] as const).map((option) => (
                    <label
                      key={option}
                      className={`format-option ${format === option ? "is-selected" : ""}`}
                    >
                      <input
                        type="radio"
                        name="format"
                        value={option}
                        checked={format === option}
                        onChange={() => {
                          setFormat(option);
                          setReadyId(null);
                          setStatus("");
                          setPhase("idle");
                        }}
                      />
                      <span className="format-icon">
                        <Icon
                          name={option === "video" ? "video" : "music"}
                          size={23}
                        />
                      </span>
                      <span className="format-copy">
                        <strong>
                          {option === "video" ? "Vídeo" : "Só o áudio"}
                        </strong>
                        <small>
                          {option === "video" ? "Imagem e som" : "Formato MP3"}
                        </small>
                      </span>
                      <span className="radio-indicator">
                        {format === option && <span />}
                      </span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="quality-row">
                <label className="field-label" htmlFor="quality">
                  {format === "video"
                    ? "Qualidade do vídeo"
                    : "Qualidade do áudio"}
                </label>
                <div className="quality-control">
                  {format === "video" ? (
                    <select
                      id="quality"
                      value={quality}
                      disabled={loading}
                      onChange={(event) => {
                        setQuality(event.target.value);
                        setReadyId(null);
                        setStatus("");
                        setPhase("idle");
                      }}
                    >
                      <option value="720p">Até 720p · HD</option>
                      <option value="1080p">Até 1080p · Full HD</option>
                      <option value="4k">Até 4K · Ultra HD</option>
                    </select>
                  ) : (
                    <span id="quality" className="audio-quality">
                      <Icon name="music" size={15} /> MP3 · Melhor disponível
                    </span>
                  )}
                </div>
              </div>
              {metadata && (
                <div className="video-preview">
                  {metadata.thumbnail ? (
                    <img src={metadata.thumbnail} alt="" />
                  ) : (
                    <span className="preview-placeholder">
                      <Icon name="video" size={24} />
                    </span>
                  )}
                  <div>
                    <span className="preview-label">
                      <Icon name="check" size={12} /> LINK ANALISADO
                    </span>
                    <h3>{metadata.title}</h3>
                    <span className="duration">
                      <Icon name="clock" size={13} />{" "}
                      {durationLabel(metadata.duration)}
                    </span>
                  </div>
                </div>
              )}
              <button
                type="submit"
                className="primary-button"
                disabled={!url.trim() || loading || !apiConfigured}
              >
                {loading ? (
                  <>
                    <span className="spinner" />
                    {phase === "preview"
                      ? "Analisando link..."
                      : "Preparando arquivo..."}
                  </>
                ) : (
                  <>
                    <Icon name={metadata ? "download" : "link"} size={20} />
                    {metadata
                      ? `Baixar ${format === "video" ? "vídeo" : "MP3"}`
                      : "Analisar link"}
                    <span className="button-end">
                      <Icon name="arrow" size={19} />
                    </span>
                  </>
                )}
              </button>
            </form>
            {status && (
              <div
                role="status"
                aria-live="polite"
                className={`notice ${phase === "error" ? "notice-error" : phase === "done" ? "notice-success" : ""}`}
              >
                {status}
                {readyId && (
                  <button
                    className="retry-download"
                    onClick={() => void downloadService.downloadFile(readyId)}
                  >
                    Baixar novamente <Icon name="download" size={14} />
                  </button>
                )}
              </div>
            )}
            <p className="panel-footnote">
              <Icon name="shield" size={14} /> Sem cadastro. Direto para o seu
              dispositivo.
            </p>
          </div>

          <aside className="workspace-aside" aria-label="Formatos disponíveis">
            <div className="visual-scene" aria-hidden="true">
              <div className="scene-orbit orbit-one" />
              <div className="scene-orbit orbit-two" />
              <span className="scene-star star-one">✦</span>
              <span className="scene-star star-two">+</span>
              <div className="floating-label label-4k">
                4K <span>ULTRA HD</span>
              </div>
              <div className="media-tile">
                <span className="tile-dots">
                  <i />
                  <i />
                  <i />
                </span>
                <div className="play-orb">
                  <svg viewBox="0 0 32 32" width="32" height="32">
                    <path d="M11 7 25 16 11 25Z" fill="currentColor" />
                  </svg>
                </div>
                <div className="tile-progress">
                  <span />
                </div>
                <span className="tile-time">SEUS FAVORITOS. COM VOCÊ.</span>
              </div>
              <div className="audio-tile">
                <span className="audio-tile-icon">
                  <Icon name="music" size={20} />
                </span>
                <div className="waveform">
                  {[12, 22, 16, 31, 24, 38, 19, 29, 14, 24, 18, 30, 12].map(
                    (height, index) => (
                      <i key={index} style={{ height }} />
                    ),
                  )}
                </div>
                <strong>MP3</strong>
              </div>
              <span className="floating-download">
                <Icon name="download" size={24} />
              </span>
            </div>
            <div className="aside-copy">
              <span className="section-label">SALVE. ESCUTE. REVEJA.</span>
              <h2>
                Seu conteúdo.
                <br />
                No seu ritmo.
              </h2>
              <p>
                Daquela música que não sai da cabeça ao vídeo que vale guardar.
              </p>
            </div>
            <div className="aside-bottom">
              <span>
                <Icon name="video" size={16} /> Vídeo
              </span>
              <span className="aside-plus">+</span>
              <span>
                <Icon name="music" size={16} /> Áudio
              </span>
              <span className="aside-dash" />
              <span>Você escolhe.</span>
            </div>
          </aside>
        </section>

        <section
          id="como-funciona"
          className="how-section"
          aria-labelledby="how-title"
        >
          <div className="how-heading">
            <span className="section-label">SEM COMPLICAÇÃO</span>
            <h2 id="how-title">Três passos. E pronto.</h2>
          </div>
          <div className="steps-grid">
            {[
              {
                title: "Copie o link",
                text: "Encontrou algo que quer guardar? Copie o endereço do vídeo.",
                icon: "link",
              },
              {
                title: "Deixe do seu jeito",
                text: "Escolha entre vídeo ou MP3 e a qualidade que prefere.",
                icon: "sparkles",
              },
              {
                title: "Leve com você",
                text: "Baixe o arquivo e aproveite quando e onde quiser.",
                icon: "download",
              },
            ].map((step, index) => (
              <article key={step.title} className="step-card">
                <span className="step-icon">
                  <Icon name={step.icon as IconName} size={21} />
                </span>
                <span className="step-number">0{index + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </article>
            ))}
          </div>
        </section>
      </main>
      <footer className="site-footer content-width">
        <span>
          VideoDownloader <span className="footer-dot">·</span> Feito para
          simplificar.
        </span>
        <p>
          A qualidade depende da fonte. Baixe apenas conteúdo que você tem
          autorização para usar.
        </p>
      </footer>
    </div>
  );
};
export default App;
