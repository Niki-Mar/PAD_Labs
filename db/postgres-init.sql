CREATE SCHEMA IF NOT EXISTS core;

CREATE TABLE IF NOT EXISTS core.users (
  id SERIAL PRIMARY KEY,
  external_id VARCHAR(64) UNIQUE NOT NULL,
  name TEXT NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.accounts (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL REFERENCES core.users(id) ON DELETE CASCADE,
  currency CHAR(3) NOT NULL DEFAULT 'USD',
  balance NUMERIC(18,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS core.transactions (
  id SERIAL PRIMARY KEY,
  from_account_id INT REFERENCES core.accounts(id),
  to_account_id INT REFERENCES core.accounts(id),
  amount NUMERIC(18,2) NOT NULL,
  status TEXT NOT NULL DEFAULT 'completed',
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

INSERT INTO core.users (external_id, name)
VALUES ('u1', 'Alice'), ('u2', 'Bob')
ON CONFLICT (external_id) DO NOTHING;

INSERT INTO core.accounts (user_id, currency, balance)
SELECT id, 'USD', 500 FROM core.users WHERE external_id = 'u1'
ON CONFLICT DO NOTHING;

INSERT INTO core.accounts (user_id, currency, balance)
SELECT id, 'USD', 300 FROM core.users WHERE external_id = 'u2'
ON CONFLICT DO NOTHING;
