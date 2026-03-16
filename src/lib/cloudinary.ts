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
