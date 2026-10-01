-- ==============================================================================
-- SecureVault — Payload CMS PostgreSQL Database Schema
-- Migration: 0001_initial_schema.sql
-- ==============================================================================

-- 1. USERS COLLECTION
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    wallet_address VARCHAR(64) UNIQUE NOT NULL,
    network VARCHAR(64) DEFAULT 'Sepolia',
    public_encryption_key TEXT,
    key_fingerprint VARCHAR(64),
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    last_authenticated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_wallet ON users(LOWER(wallet_address));
CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);

-- 2. FILES COLLECTION
CREATE TABLE IF NOT EXISTS files (
    id VARCHAR(64) PRIMARY KEY,
    file_id VARCHAR(64) UNIQUE NOT NULL,
    owner_wallet VARCHAR(64) NOT NULL,
    filename VARCHAR(255) NOT NULL,
    size BIGINT NOT NULL,
    mime_type VARCHAR(128) NOT NULL,
    chunk_size INTEGER NOT NULL DEFAULT 8388608,
    total_chunks INTEGER NOT NULL DEFAULT 1,
    encryption_algorithm VARCHAR(64) NOT NULL DEFAULT 'AES-256-GCM',
    integrity_algorithm VARCHAR(64) NOT NULL DEFAULT 'SHA-256',
    manifest_cid VARCHAR(255),
    status VARCHAR(32) NOT NULL DEFAULT 'preparing',
    logical_path VARCHAR(512),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_files_owner_wallet ON files(LOWER(owner_wallet));
CREATE INDEX IF NOT EXISTS idx_files_file_id ON files(file_id);
CREATE INDEX IF NOT EXISTS idx_files_status ON files(status);
CREATE INDEX IF NOT EXISTS idx_files_manifest_cid ON files(manifest_cid);
CREATE INDEX IF NOT EXISTS idx_files_owner_status ON files(LOWER(owner_wallet), status);

-- 3. FILE CHUNKS COLLECTION
CREATE TABLE IF NOT EXISTS file_chunks (
    id VARCHAR(64) PRIMARY KEY,
    file_id VARCHAR(64) NOT NULL,
    chunk_index INTEGER NOT NULL,
    ipfs_cid VARCHAR(255) NOT NULL,
    sha256 VARCHAR(64) NOT NULL,
    iv VARCHAR(64) NOT NULL,
    encrypted_size BIGINT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'uploaded',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT uq_file_chunk UNIQUE (file_id, chunk_index)
);

CREATE INDEX IF NOT EXISTS idx_chunks_file_id ON file_chunks(file_id);
CREATE INDEX IF NOT EXISTS idx_chunks_file_index ON file_chunks(file_id, chunk_index);
CREATE INDEX IF NOT EXISTS idx_chunks_cid ON file_chunks(ipfs_cid);

-- 4. SHARES COLLECTION
CREATE TABLE IF NOT EXISTS shares (
    id VARCHAR(64) PRIMARY KEY,
    share_id VARCHAR(64) UNIQUE NOT NULL,
    file_id VARCHAR(64) NOT NULL,
    owner_wallet VARCHAR(64) NOT NULL,
    recipient VARCHAR(128) NOT NULL,
    recipient_public_key_fingerprint VARCHAR(64),
    encrypted_file_key TEXT NOT NULL,
    key_agreement_metadata JSONB,
    expires_at TIMESTAMPTZ,
    max_downloads INTEGER DEFAULT 1,
    download_count INTEGER DEFAULT 0,
    one_time BOOLEAN DEFAULT FALSE,
    status VARCHAR(32) NOT NULL DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    last_accessed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_shares_share_id ON shares(share_id);
CREATE INDEX IF NOT EXISTS idx_shares_file_id ON shares(file_id);
CREATE INDEX IF NOT EXISTS idx_shares_owner_wallet ON shares(LOWER(owner_wallet));
CREATE INDEX IF NOT EXISTS idx_shares_recipient ON shares(LOWER(recipient));
CREATE INDEX IF NOT EXISTS idx_shares_status ON shares(status);
CREATE INDEX IF NOT EXISTS idx_shares_expires_at ON shares(expires_at);

-- 5. ACTIVITY COLLECTION
CREATE TABLE IF NOT EXISTS activity (
    id VARCHAR(64) PRIMARY KEY,
    user_wallet VARCHAR(64) NOT NULL,
    file_id VARCHAR(64),
    share_id VARCHAR(64),
    action VARCHAR(64) NOT NULL,
    metadata JSONB,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_activity_user_wallet ON activity(LOWER(user_wallet));
CREATE INDEX IF NOT EXISTS idx_activity_file_id ON activity(file_id);
CREATE INDEX IF NOT EXISTS idx_activity_action ON activity(action);
CREATE INDEX IF NOT EXISTS idx_activity_timestamp ON activity(timestamp DESC);
