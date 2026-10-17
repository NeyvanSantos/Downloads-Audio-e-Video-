CREATE TABLE IF NOT EXISTS downloads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  url_original TEXT NOT NULL,
  url_extracted TEXT,
  type VARCHAR(10) NOT NULL CHECK (type IN ('video', 'audio')),
  quality VARCHAR(10) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'downloading', 'converting', 'ready', 'failed')),
  file_path TEXT,
  file_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  expires_at TIMESTAMP WITH TIME ZONE,
  ip_address VARCHAR(45)
);

CREATE INDEX idx_downloads_status ON downloads(status);
CREATE INDEX idx_downloads_created_at ON downloads(created_at);
CREATE INDEX idx_downloads_url ON downloads(url_original);
