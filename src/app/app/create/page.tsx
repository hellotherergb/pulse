import { CreateForm } from "@/components/create-form";

export default async function CreatePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  return (
    <div>
      <div className="px-4 pt-4">
        <h1 className="font-display text-2xl font-700">Create</h1>
        <p className="mt-1 text-sm text-muted">
          Post text, photos, clips — or a 24h story.
        </p>
      </div>
      <CreateForm defaultTab={params.tab} />
    </div>
  );
}
