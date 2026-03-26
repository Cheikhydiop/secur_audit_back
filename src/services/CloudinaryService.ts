/**
 * CloudinaryService — SmartAudit DG-SECU/Sonatel
 * Service d'upload de photos vers Cloudinary
 * Alternative à MinIO pour le stockage des photos d'inspection (PB-035)
 *
 * Usage : Upload des photos de points de contrôle (max 5 photos, 10 MB)
 */
import { v2 as cloudinary, UploadApiResponse, UploadApiErrorResponse } from 'cloudinary';
import { DatabaseError, ValidationError } from '../errors/customErrors.js';
import logger from '../utils/logger.js';
import config from '../config/env.js';

// Configuration Cloudinary depuis le service de config
cloudinary.config({
  cloud_name: config.cloudinary.cloudName,
  api_key: config.cloudinary.apiKey,
  api_secret: config.cloudinary.apiSecret,
  secure: true,
});

const INSPECTION_FOLDER = 'smartinspect360/inspections';
const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
const MAX_PHOTOS_PER_POINT = 5;
const ALLOWED_FORMATS = ['jpg', 'jpeg', 'png', 'webp'];

export interface InspectionPhotoUploadResult {
  url: string;
  publicId: string;
  width: number;
  height: number;
  format: string;
  size: number;
}

export class CloudinaryService {

  /**
   * Upload une photo de point de contrôle depuis un chemin de fichier
   * @param filePath Chemin local du fichier
   * @param inspectionId ID de l'inspection
   * @param questionId ID de la question/point de contrôle
   */
  static async uploadInspectionPhoto(
    filePath: string,
    inspectionId: string,
    questionId: string
  ): Promise<InspectionPhotoUploadResult> {
    try {
      const folder = `${INSPECTION_FOLDER}/${inspectionId}/${questionId}`;

      const result = await cloudinary.uploader.upload(filePath, {
        folder,
        resource_type: 'image',
        allowed_formats: ALLOWED_FORMATS,
        transformation: [
          { quality: 'auto:good' },
          { fetch_format: 'auto' },
        ],
        tags: ['inspection', inspectionId, questionId],
      });

      logger.info(`📸 Photo uploadée sur Cloudinary: ${result.public_id}`);

      return {
        url: result.secure_url,
        publicId: result.public_id,
        width: result.width,
        height: result.height,
        format: result.format,
        size: result.bytes,
      };
    } catch (error: any) {
      logger.error(`❌ Cloudinary upload échoué: ${error.message}`);
      throw new DatabaseError(`Échec de l'upload de la photo: ${error.message}`);
    }
  }

  /**
   * Upload une photo depuis un buffer (compatible avec multer memory storage)
   * @param fileBuffer Buffer du fichier
   * @param inspectionId ID de l'inspection
   * @param questionId ID de la question/point de contrôle
   * @param existingCount Nombre de photos déjà uploadées pour ce point
   */
  static async uploadBuffer(
    fileBuffer: Buffer,
    inspectionId: string,
    questionId: string,
    existingCount: number = 0,
    mimeType: string = 'image/jpeg'
  ): Promise<InspectionPhotoUploadResult> {
    // Validation : max 5 photos par point
    if (existingCount >= MAX_PHOTOS_PER_POINT) {
      throw new ValidationError(`Maximum ${MAX_PHOTOS_PER_POINT} photos par point de contrôle`);
    }

    // Validation : taille max 10 MB
    if (fileBuffer.length > MAX_FILE_SIZE_BYTES) {
      throw new ValidationError(`La photo dépasse la taille maximale de 10 MB`);
    }

    // Validation : format
    const format = mimeType.split('/')[1];
    if (!ALLOWED_FORMATS.includes(format)) {
      throw new ValidationError(`Format non supporté. Formats acceptés: ${ALLOWED_FORMATS.join(', ')}`);
    }

    return new Promise((resolve, reject) => {
      const folder = `${INSPECTION_FOLDER}/${inspectionId}/${questionId}`;

      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          allowed_formats: ALLOWED_FORMATS,
          transformation: [
            { quality: 'auto:good' },
            { fetch_format: 'auto' },
          ],
          tags: ['inspection', inspectionId, questionId],
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            logger.error(`❌ Cloudinary buffer upload échoué: ${error.message}`);
            return reject(new DatabaseError(`Échec de l'upload: ${error.message}`));
          }
          if (!result) {
            return reject(new DatabaseError('Résultat Cloudinary indéfini'));
          }

          logger.info(`📸 Photo uploadée sur Cloudinary: ${result.public_id}`);
          resolve({
            url: result.secure_url,
            publicId: result.public_id,
            width: result.width,
            height: result.height,
            format: result.format,
            size: result.bytes,
          });
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Supprimer une photo par son public_id
   * @param publicId Public ID Cloudinary de la photo
   */
  static async deletePhoto(publicId: string): Promise<void> {
    try {
      await cloudinary.uploader.destroy(publicId);
      logger.info(`🗑️ Photo supprimée de Cloudinary: ${publicId}`);
    } catch (error: any) {
      logger.error(`❌ Cloudinary suppression échouée: ${error.message}`);
      throw new DatabaseError(`Échec de la suppression: ${error.message}`);
    }
  }

  /**
   * Supprimer toutes les photos d'une inspection
   * @param inspectionId ID de l'inspection
   */
  static async deleteInspectionPhotos(inspectionId: string): Promise<void> {
    try {
      const folder = `${INSPECTION_FOLDER}/${inspectionId}`;
      await cloudinary.api.delete_resources_by_prefix(folder);
      // Supprimer le dossier lui-même (peut échouer si non vide ou déjà supprimé, donc on ignore si erreur)
      await cloudinary.api.delete_folder(folder).catch(() => { });
      logger.info(`🗑️ Toutes les photos et le dossier de l'inspection ${inspectionId} supprimés`);
    } catch (error: any) {
      logger.error(`❌ Suppression inspection photos échouée: ${error.message}`);
      throw new DatabaseError(`Échec de la suppression des photos: ${error.message}`);
    }
  }

  /**
   * Générer une URL de transformation (miniature, etc.)
   * @param publicId Public ID Cloudinary
   * @param width Largeur souhaitée
   * @param height Hauteur souhaitée
   */
  static getThumbnailUrl(publicId: string, width = 300, height = 200): string {
    return cloudinary.url(publicId, {
      width,
      height,
      crop: 'fill',
      quality: 'auto',
      fetch_format: 'auto',
      secure: true,
    });
  }

  /**
   * Upload un fichier brut (PDF, Excel, etc.) vers Cloudinary
   * @param fileBuffer Buffer du fichier
   * @param publicId Nom du fichier (sans extension)
   */
  static async uploadRaw(
    fileBuffer: Buffer,
    publicId: string
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: 'smartinspect360/reports',
          public_id: publicId, // Garder l'extension pour les fichiers raw
          resource_type: 'raw', // Forcer en 'raw' pour les documents (PDF/Excel)
          type: 'authenticated', // Forcer en mode authentifié (plus restrictif et sûr)
          access_mode: 'authenticated', // Forcer l'accès authentifié
          tags: ['report'],
          use_filename: true
        },
        (error: UploadApiErrorResponse | undefined, result: UploadApiResponse | undefined) => {
          if (error) {
            logger.error(`❌ Cloudinary raw upload échoué: ${error.message}`);
            return reject(new DatabaseError(`Échec de l'upload du rapport: ${error.message}`));
          }
          resolve(result);
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  /**
   * Générer une URL signée pour les ressources raw privées
   */
  static getSignedUrl(publicId: string): string {
    return cloudinary.url(publicId, {
      resource_type: 'raw',
      type: 'authenticated',
      sign_url: true,
      secure: true
    });
  }

  static getCloudinary() {
    return cloudinary;
  }

  /**
   * Extrait le publicId Cloudinary depuis une URL de média
   */
  static getPublicIdFromUrl(url: string): string | null {
    try {
      if (!url) return null;
      // Format attendu: .../v1234567/smartinspect360/.../public_id.ext
      const parts = url.split('/');
      const fileNameWithExt = parts[parts.length - 1];
      const publicId = fileNameWithExt.split('.')[0];

      // On retrouve le dossier
      const folderStartIndex = parts.indexOf('smartinspect360');
      if (folderStartIndex === -1) return publicId;

      return parts.slice(folderStartIndex).join('/').split('.')[0];
    } catch (e) {
      return null;
    }
  }
}

export default CloudinaryService;
