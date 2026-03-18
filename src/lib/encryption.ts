import CryptoJS from 'crypto-js';

const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || 'default-fallback-key-change-me';

/**
 * Encripta uma string usando AES
 */
export const encryptPassword = (password: string): string => {
  return CryptoJS.AES.encrypt(password, SECRET_KEY).toString();
};

/**
 * Decripta uma string encriptada em AES
 */
export const decryptPassword = (ciphertext: string): string => {
  try {
    const bytes = CryptoJS.AES.decrypt(ciphertext, SECRET_KEY);
    const originalText = bytes.toString(CryptoJS.enc.Utf8);
    return originalText || ciphertext; // Retorna original se falhar opcionalmente
  } catch (error) {
    return ciphertext;
  }
};
