import { BannerEditor } from "@/components/admin/BannerEditor";

type Props = { params: Promise<{ id: string }> };

export default async function AdminBannerEditPage({ params }: Props) {
  const { id } = await params;
  return <BannerEditor bannerId={id} />;
}
