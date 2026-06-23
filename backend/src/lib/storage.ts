import {
  S3Client,
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  HeadObjectCommand,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { env } from '../config/env.js';

export const s3 = new S3Client({
  endpoint: env.S3_ENDPOINT,
  region: env.S3_REGION,
  forcePathStyle: env.S3_FORCE_PATH_STYLE,
  credentials: {
    accessKeyId: env.S3_ACCESS_KEY,
    secretAccessKey: env.S3_SECRET_KEY,
  },
});

export const BUCKET = env.S3_BUCKET;

export async function presignUpload(key: string, contentType: string, expiresIn = 300) {
  const cmd = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: contentType });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function presignDownload(key: string, expiresIn = 300) {
  const cmd = new GetObjectCommand({ Bucket: BUCKET, Key: key });
  return getSignedUrl(s3, cmd, { expiresIn });
}

export async function deleteObject(key: string) {
  await s3.send(new DeleteObjectCommand({ Bucket: BUCKET, Key: key }));
}

/** Devuelve tamaño y content-type reales del objeto, o null si no existe. */
export async function statObject(
  key: string,
): Promise<{ sizeBytes: number; contentType: string | null } | null> {
  try {
    const head = await s3.send(new HeadObjectCommand({ Bucket: BUCKET, Key: key }));
    return {
      sizeBytes: head.ContentLength ?? 0,
      contentType: head.ContentType ?? null,
    };
  } catch {
    return null;
  }
}
