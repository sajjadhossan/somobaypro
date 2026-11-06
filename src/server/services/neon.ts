import { neon, NeonQueryFunction } from '@neondatabase/serverless';
import { S3Client, ListBucketsCommand, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import dotenv from 'dotenv';
import path from 'path';

// Load environment variables (.env.local has precedence for Neon)
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

// ==========================================
// 1. Neon Postgres Service
// ==========================================
export const DATABASE_URL =
  process.env.DATABASE_URL ||
  'postgresql://neondb_owner:npg_PplBFE67sgGz@ep-muddy-surf-az9i5aeb-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';
export const DATABASE_URL_UNPOOLED =
  process.env.DATABASE_URL_UNPOOLED ||
  'postgresql://neondb_owner:npg_PplBFE67sgGz@ep-muddy-surf-az9i5aeb.c-3.ap-southeast-1.aws.neon.tech/neondb?channel_binding=require&sslmode=require';

let sqlInstance: NeonQueryFunction<false, false> | null = null;

export function getNeonSql(): NeonQueryFunction<false, false> {
  if (!sqlInstance) {
    if (!DATABASE_URL) {
      throw new Error('DATABASE_URL is not defined in environment variables');
    }
    sqlInstance = neon(DATABASE_URL);
  }
  return sqlInstance;
}

// ==========================================
// 2. Neon Object Storage Service (S3-compatible)
// ==========================================
export const AWS_ACCESS_KEY_ID = process.env.AWS_ACCESS_KEY_ID || 'nak_live_343be07f644642a8bba3718c204b97f1';
export const AWS_SECRET_ACCESS_KEY = process.env.AWS_SECRET_ACCESS_KEY || 'nsk_live_2144da7b4e803c9768b8824c1ee7cb5c408a4c87a1019eb27fd5df76d1095437';
export const AWS_ENDPOINT_URL_S3 = process.env.AWS_ENDPOINT_URL_S3 || 'https://br-blue-dream-azewc3tn.storage.c-3.ap-southeast-1.aws.neon.tech';
export const AWS_REGION = process.env.AWS_REGION || 'ap-southeast-1';
export const ASSETS_BUCKET = 'assets';

let s3ClientInstance: S3Client | null = null;

export function getNeonStorage(): S3Client {
  if (!s3ClientInstance) {
    s3ClientInstance = new S3Client({
      region: AWS_REGION,
      endpoint: AWS_ENDPOINT_URL_S3,
      credentials: {
        accessKeyId: AWS_ACCESS_KEY_ID,
        secretAccessKey: AWS_SECRET_ACCESS_KEY,
      },
      forcePathStyle: true,
    });
  }
  return s3ClientInstance;
}

export async function uploadToNeonStorage(key: string, body: Buffer | Uint8Array | string, contentType?: string) {
  const s3 = getNeonStorage();
  const command = new PutObjectCommand({
    Bucket: ASSETS_BUCKET,
    Key: key,
    Body: body,
    ContentType: contentType || 'application/octet-stream',
  });
  return await s3.send(command);
}

// ==========================================
// 3. Neon Auth Service
// ==========================================
export const NEON_AUTH_BASE_URL =
  process.env.NEON_AUTH_BASE_URL ||
  'https://ep-muddy-surf-az9i5aeb.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth';
export const NEON_AUTH_JWKS_URL =
  process.env.NEON_AUTH_JWKS_URL ||
  'https://ep-muddy-surf-az9i5aeb.neonauth.c-3.ap-southeast-1.aws.neon.tech/neondb/auth/.well-known/jwks.json';

let authClientInstance: any = null;

export async function getNeonAuthClient() {
  if (!authClientInstance) {
    const { createAuthClient } = await import('@neon/auth');
    authClientInstance = createAuthClient(NEON_AUTH_BASE_URL);
  }
  return authClientInstance;
}

export async function getNeonAuthJwks() {
  if (!NEON_AUTH_JWKS_URL) {
    throw new Error('NEON_AUTH_JWKS_URL is not defined in environment variables');
  }
  const response = await fetch(NEON_AUTH_JWKS_URL);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.statusText}`);
  }
  return await response.json();
}

// ==========================================
// 4. Neon Realtime Service
// ==========================================
export const NEON_REALTIME_URL =
  process.env.NEON_REALTIME_URL || 'wss://ep-muddy-surf-az9i5aeb.rt.c-3.ap-southeast-1.aws.neon.tech/';
export const NEON_REALTIME_SECRET =
  process.env.NEON_REALTIME_SECRET || 'nrt_live_1MrcdkAkqYcyuskYxgJMSp7ax1Lgwm_msUXu1q6nurWA';

// ==========================================
// End-to-End Health & Diagnostic Checker
// ==========================================
export interface NeonServiceStatus {
  service: 'postgres' | 'object-storage' | 'auth' | 'realtime';
  status: 'ok' | 'error';
  latencyMs: number;
  details: Record<string, any>;
  error?: string;
}

export async function testAllNeonServices(): Promise<{
  success: boolean;
  timestamp: string;
  services: NeonServiceStatus[];
}> {
  const results: NeonServiceStatus[] = [];

  // 1. Test Postgres
  const pgStart = Date.now();
  try {
    const sql = getNeonSql();
    const rows = await sql`SELECT NOW() as now, current_database() as db, version() as ver;`;
    results.push({
      service: 'postgres',
      status: 'ok',
      latencyMs: Date.now() - pgStart,
      details: {
        database: rows[0]?.db,
        serverTime: rows[0]?.now,
        branch: process.env.NEON_BRANCH || 'production',
        pooled: DATABASE_URL.includes('-pooler'),
      },
    });
  } catch (err: any) {
    results.push({
      service: 'postgres',
      status: 'error',
      latencyMs: Date.now() - pgStart,
      details: {},
      error: err.message,
    });
  }

  // 2. Test Object Storage
  const s3Start = Date.now();
  try {
    const s3 = getNeonStorage();
    const data = await s3.send(new ListBucketsCommand({}));
    results.push({
      service: 'object-storage',
      status: 'ok',
      latencyMs: Date.now() - s3Start,
      details: {
        endpoint: AWS_ENDPOINT_URL_S3,
        buckets: data.Buckets?.map((b) => b.Name) || [],
      },
    });
  } catch (err: any) {
    results.push({
      service: 'object-storage',
      status: 'error',
      latencyMs: Date.now() - s3Start,
      details: {},
      error: err.message,
    });
  }

  // 3. Test Neon Auth
  const authStart = Date.now();
  try {
    const jwks = await getNeonAuthJwks();
    results.push({
      service: 'auth',
      status: 'ok',
      latencyMs: Date.now() - authStart,
      details: {
        authBaseUrl: NEON_AUTH_BASE_URL,
        jwksUrl: NEON_AUTH_JWKS_URL,
        keyCount: jwks.keys?.length || 0,
      },
    });
  } catch (err: any) {
    results.push({
      service: 'auth',
      status: 'error',
      latencyMs: Date.now() - authStart,
      details: {},
      error: err.message,
    });
  }

  // 4. Test Neon Realtime
  const rtStart = Date.now();
  try {
    if (!NEON_REALTIME_URL) throw new Error('NEON_REALTIME_URL not configured');
    const httpUrl = NEON_REALTIME_URL.replace('wss://', 'https://').replace('ws://', 'http://');
    const response = await fetch(httpUrl);
    results.push({
      service: 'realtime',
      status: 'ok',
      latencyMs: Date.now() - rtStart,
      details: {
        realtimeUrl: NEON_REALTIME_URL,
        hasSecret: !!NEON_REALTIME_SECRET,
        serverBuild: response.headers.get('neon-realtime-build') || 'active',
      },
    });
  } catch (err: any) {
    results.push({
      service: 'realtime',
      status: 'error',
      latencyMs: Date.now() - rtStart,
      details: {},
      error: err.message,
    });
  }

  const allOk = results.every((r) => r.status === 'ok');
  return {
    success: allOk,
    timestamp: new Date().toISOString(),
    services: results,
  };
}
