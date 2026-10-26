-- Client reports are untrusted observations. No visitor identifier or raw address is stored.
CREATE TABLE benchmark_records (
  id TEXT PRIMARY KEY,
  digest TEXT NOT NULL,
  created INTEGER NOT NULL,
  expires INTEGER NOT NULL,
  record TEXT NOT NULL CHECK (length(CAST(record AS BLOB)) <= 262144)
);
CREATE INDEX benchmark_records_expiry ON benchmark_records(expires);
CREATE INDEX benchmark_records_created ON benchmark_records(created, id);
CREATE TABLE benchmark_rates (
  key TEXT PRIMARY KEY,
  uses INTEGER NOT NULL,
  expires INTEGER NOT NULL
);
CREATE INDEX benchmark_rates_expiry ON benchmark_rates(expires);
