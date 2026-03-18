const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || "dlmkynuni";
const UPLOAD_PRESET = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || "";
const DEFAULT_FOLDER = "store/products";

export async function uploadToCloudinary(file: File, folder: string = DEFAULT_FOLDER): Promise<{ secure_url: string; public_id: string }> {
  if (!UPLOAD_PRESET) throw new Error("Upload preset não configurado. Defina VITE_CLOUDINARY_UPLOAD_PRESET no .env");
  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", UPLOAD_PRESET);
  formData.append("folder", folder);
  const res = await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`, { method: "POST", body: formData });
  if (!res.ok) throw new Error(`Falha no upload Cloudinary: ${await res.text()}`);
  const data = await res.json();
  return { secure_url: data.secure_url as string, public_id: data.public_id as string };
}

export async function removeFromCloudinary(publicId: string): Promise<void> {
  if (!publicId) return;
  try {
    // Nota: O Cloudinary exige API Secret para destruição via SDK padrão por segurança.
    // Como estamos no Frontend, chamamos o endpoint de upload/destroy com o preset configurado para permitir destruição não assinada (caso habilitado no Cloudinary).
    // Caso sua conta não permita destruição não assinada, o arquivo sairá do banco mas permanecerá no Cloudinary.
    const formData = new FormData();
    formData.append("public_id", publicId);
    formData.append("upload_preset", UPLOAD_PRESET);

    await fetch(`https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/destroy`, {
      method: "POST",
      body: formData
    });
  } catch (error) {
    console.error("Falha ao remover imagem do Cloudinary:", error);
  }
}
