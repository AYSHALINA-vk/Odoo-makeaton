import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center text-white p-6">
      <h2 className="text-3xl font-extrabold mb-2 text-brand-400">404 - Page Not Found</h2>
      <p className="text-sm text-zinc-400 mb-6">The page you are looking for does not exist.</p>
      <Link
        href="/"
        className="px-4 py-2 bg-brand-500 hover:bg-brand-600 text-white rounded-xl text-xs font-semibold"
      >
        Return Home
      </Link>
    </div>
  );
}
