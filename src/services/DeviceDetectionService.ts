// src/services/DeviceDetectionService.ts
import crypto from 'crypto';
import { DeviceType } from '@prisma/client';

interface DeviceInfo {
    deviceType: DeviceType;
    deviceName: string;
    browser: string;
    os: string;
}

export class DeviceDetectionService {
    /**
     * Extrait les informations de l'appareil depuis le User-Agent
     */
    static parseDeviceInfo(userAgent: string): DeviceInfo {
        const ua = userAgent.toLowerCase();

        // Détection du type d'appareil
        let deviceType: DeviceType = 'UNKNOWN';
        let deviceName = 'Appareil inconnu';

        // Mobile
        if (/mobile|android|iphone|ipod|blackberry|iemobile|opera mini/i.test(ua)) {
            deviceType = 'MOBILE';

            if (/iphone/i.test(ua)) {
                deviceName = 'iPhone';
            } else if (/android/i.test(ua)) {
                // Extraire le modèle Android si possible
                const match = ua.match(/android.*;\s*([^)]+)\s*build/i);
                deviceName = match ? match[1].trim() : 'Android';
            } else if (/blackberry/i.test(ua)) {
                deviceName = 'BlackBerry';
            } else {
                deviceName = 'Mobile';
            }
        }
        // Tablet
        else if (/ipad|tablet|kindle|playbook|nexus 7|nexus 10/i.test(ua)) {
            deviceType = 'TABLET';

            if (/ipad/i.test(ua)) {
                deviceName = 'iPad';
            } else if (/kindle/i.test(ua)) {
                deviceName = 'Kindle';
            } else {
                deviceName = 'Tablet';
            }
        }
        // Desktop
        else {
            deviceType = 'DESKTOP';

            if (/windows/i.test(ua)) {
                deviceName = 'Windows PC';
            } else if (/macintosh|mac os x/i.test(ua)) {
                deviceName = 'Mac';
            } else if (/linux/i.test(ua)) {
                deviceName = 'Linux PC';
            } else {
                deviceName = 'Desktop';
            }
        }

        // Détection du navigateur
        let browser = 'Navigateur inconnu';
        if (/chrome/i.test(ua) && !/edge|edg/i.test(ua)) {
            const match = ua.match(/chrome\/([0-9.]+)/i);
            browser = match ? `Chrome ${match[1].split('.')[0]}` : 'Chrome';
        } else if (/safari/i.test(ua) && !/chrome/i.test(ua)) {
            const match = ua.match(/version\/([0-9.]+)/i);
            browser = match ? `Safari ${match[1].split('.')[0]}` : 'Safari';
        } else if (/firefox/i.test(ua)) {
            const match = ua.match(/firefox\/([0-9.]+)/i);
            browser = match ? `Firefox ${match[1].split('.')[0]}` : 'Firefox';
        } else if (/edge|edg/i.test(ua)) {
            const match = ua.match(/edg\/([0-9.]+)/i);
            browser = match ? `Edge ${match[1].split('.')[0]}` : 'Edge';
        }

        // Détection de l'OS
        let os = 'OS inconnu';
        if (/windows nt 10/i.test(ua)) {
            os = 'Windows 10/11';
        } else if (/windows nt 6.3/i.test(ua)) {
            os = 'Windows 8.1';
        } else if (/windows nt 6.2/i.test(ua)) {
            os = 'Windows 8';
        } else if (/windows nt 6.1/i.test(ua)) {
            os = 'Windows 7';
        } else if (/windows/i.test(ua)) {
            os = 'Windows';
        } else if (/mac os x ([0-9_]+)/i.test(ua)) {
            const match = ua.match(/mac os x ([0-9_]+)/i);
            os = match ? `macOS ${match[1].replace(/_/g, '.')}` : 'macOS';
        } else if (/android ([0-9.]+)/i.test(ua)) {
            const match = ua.match(/android ([0-9.]+)/i);
            os = match ? `Android ${match[1]}` : 'Android';
        } else if (/iphone os ([0-9_]+)/i.test(ua)) {
            const match = ua.match(/iphone os ([0-9_]+)/i);
            os = match ? `iOS ${match[1].replace(/_/g, '.')}` : 'iOS';
        } else if (/ipad.*os ([0-9_]+)/i.test(ua)) {
            const match = ua.match(/os ([0-9_]+)/i);
            os = match ? `iPadOS ${match[1].replace(/_/g, '.')}` : 'iPadOS';
        } else if (/linux/i.test(ua)) {
            os = 'Linux';
        }

        return {
            deviceType,
            deviceName,
            browser,
            os
        };
    }

    /**
     * Génère un identifiant unique pour l'appareil
     * Basé sur le User-Agent et l'IP
     */
    static generateDeviceId(userAgent: string, ipAddress: string): string {
        const hash = crypto
            .createHash('sha256')
            .update(`${userAgent}-${ipAddress}`)
            .digest('hex');

        return hash.substring(0, 16);
    }

    /**
     * Formate les informations de l'appareil pour l'affichage
     */
    static formatDeviceInfo(deviceInfo: DeviceInfo): string {
        return `${deviceInfo.deviceName} (${deviceInfo.browser})`;
    }
}
