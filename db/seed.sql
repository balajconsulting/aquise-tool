-- Seed-Daten für das Akquise-Tool 

-- Beispiel-Leads für das Akquise-Tool
INSERT INTO leads (firm_name, domain, phone, email, score, category, impressum_url, last_checked, is_duplicate)
VALUES
  ('Muster GmbH', 'www.musterseite.de', '+49 123 456789', 'info@musterseite.de', 42, 'Altmodisch + unsicher', '/impressum', '2024-06-01', FALSE),
  ('Beispiel AG', 'www.beispiel.de', '+49 987 654321', 'kontakt@beispiel.de', 75, 'Modern', '/impressum', '2024-06-01', FALSE),
  ('Testfirma OHG', 'www.testfirma.com', '+49 555 123456', 'mail@testfirma.com', 30, 'Fehlendes Impressum', NULL, '2024-06-01', FALSE),
  ('Web Solutions KG', 'www.websolutions.de', '+49 222 333444', 'kontakt@websolutions.de', 60, 'Verbesserungswürdig', '/impressum', '2024-06-01', FALSE),
  ('Alpha Digital', 'www.alphadigital.io', '+49 111 222333', 'info@alphadigital.io', 90, 'Sehr gut', '/impressum', '2024-06-01', FALSE); 