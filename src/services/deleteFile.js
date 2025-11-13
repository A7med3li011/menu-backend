import fs from "fs";
import path from "path";

export function deleteUploadedFile(filename) {
  const filePath = path.join(process.cwd(), "uploads", filename);

  fs.unlink(filePath, (err) => {
    if (err) {
      console.log(`❌ Failed to delete file: ${filePath}`, err);
    } else {
      console.log(`✅ File deleted successfully: ${filePath}`);
    }
  });
}
