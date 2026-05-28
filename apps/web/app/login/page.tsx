import Image from "next/image";
import { redirect } from "next/navigation";
import { withAuth } from "@workos-inc/authkit-nextjs";
import { getBrand } from "@/src/lib/brand";

export default async function LoginPage() {
  const { user } = await withAuth();
  if (user) redirect("/");

  const brand = await getBrand();

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm text-center">
        <Image
          src={brand.logoSrc}
          alt={brand.name}
          width={150}
          height={222}
          priority
          className="mx-auto h-auto w-36 rounded-lg"
        />
        <p className="mt-4 font-heading text-sm tracking-wide text-burgundy">{brand.tagline}</p>

        <div className="mt-8 rounded-xl border border-navy/10 bg-cream/40 p-6 shadow-sm">
          <h1 className="mb-5 text-xl text-navy">Sign in</h1>
          <a
            href="/sign-in"
            className="block rounded-md bg-burgundy px-4 py-2.5 font-semibold text-cream transition hover:bg-rose"
          >
            Sign in
          </a>
          <p className="mt-3 text-xs text-navy/50">Secured by WorkOS · MFA supported</p>
        </div>
      </div>
    </main>
  );
}
