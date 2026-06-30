import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

export const compressImage = async (file: Express.Multer.File, uploadDir: string): Promise<string> => {
  const filename = `${Date.now()}-${Math.round(Math.random() * 1e9)}.webp`;
  const filepath = path.join(uploadDir, filename);

  // Ensure upload dir exists
  if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
  }

  await sharp(file.buffer)
    .webp({ quality: 80 })
    .resize(1920, 1080, { fit: 'inside', withoutEnlargement: true })
    .toFile(filepath);

  return filename;
};
