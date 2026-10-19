import LoadingAnimation from "@/components/LoadingAnimation";

export default function Loading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-950">
      <LoadingAnimation size={160} label="Loading workspace" />
    </main>
  );
}
