CREATE TABLE IF NOT EXISTS kural_revisions (
  id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
  kural_number INT NOT NULL,
  snapshot LONGTEXT NOT NULL,
  changed_by VARCHAR(120) NOT NULL DEFAULT 'admin',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY idx_kural_revisions_number (kural_number),
  KEY idx_kural_revisions_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
