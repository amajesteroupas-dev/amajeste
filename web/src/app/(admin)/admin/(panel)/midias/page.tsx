import { MediaLibraryAdmin } from "@/components/admin/MediaLibraryAdmin";
import { SizeGuideAdmin } from "@/components/admin/SizeGuideAdmin";

export default function AdminMidiasPage() {
  return (
    <div className="space-y-8">
      <SizeGuideAdmin />
      <MediaLibraryAdmin />
    </div>
  );
}
