-- Datenbankschema für das Akquise-Tool 

-- Leads-Tabelle
CREATE TABLE IF NOT EXISTS leads (
    id INT AUTO_INCREMENT PRIMARY KEY,
    firm_name VARCHAR(255) NOT NULL,
    domain VARCHAR(255) NOT NULL,
    phone VARCHAR(100),
    email VARCHAR(255),
    score INT DEFAULT 0,
    category VARCHAR(255),
    impressum_url VARCHAR(255),
    last_checked DATE,
    is_duplicate BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    scoring_details TEXT
);

-- Scoring-Regeln
CREATE TABLE IF NOT EXISTS scoring_rules (
    id INT AUTO_INCREMENT PRIMARY KEY,
    criterion VARCHAR(255) NOT NULL,
    weight INT NOT NULL,
    description TEXT,
    active BOOLEAN DEFAULT TRUE
);

-- Crawler-Jobs
CREATE TABLE IF NOT EXISTS crawler_jobs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    source VARCHAR(255) NOT NULL,
    ort VARCHAR(255),
    searchTerm VARCHAR(255),
    leadLimit INT,
    umkreis INT,
    status VARCHAR(50) DEFAULT 'pending',
    started_at TIMESTAMP NULL,
    finished_at TIMESTAMP NULL,
    error TEXT
);

-- Notizen zu Leads
CREATE TABLE IF NOT EXISTS notes (
    id INT AUTO_INCREMENT PRIMARY KEY,
    lead_id INT NOT NULL,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
); 