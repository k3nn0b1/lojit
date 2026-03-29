import CryptoJS from 'crypto-js';

const FALLBACK_KEY = 'default-fallback-key-change-me';
const SECRET_KEY = import.meta.env.VITE_ENCRYPTION_KEY || FALLBACK_KEY;

// ⚠️ SEGURANÇA: Garante que a chave real está configurada em produção.
// Em dev, apenas avisa. Em produção, lança erro para evitar dados com chave insegura.
if (SECRET_KEY === FALLBACK_KEY) {
  if (import.meta.env.PROD) {
    throw new Error(
      '[Lojit] VITE_ENCRYPTION_KEY não está configurada. Defina-a nas variáveis de ambiente antes de fazer deploy.'
    );
  } else {
    console.warn(
      '[Lojit] ⚠️  VITE_ENCRYPTION_KEY não configurada — usando chave de fallback. NÃO use em produção!'
    );
  }
}

/**
 * Encripta uma string usando AES (armazenamento de senhas operacionais do Master Panel).
 * Nota: AES simétrico — a segurança depende de VITE_ENCRYPTION_KEY ser forte e privada.
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
