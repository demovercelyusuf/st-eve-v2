import { redirect } from "next/navigation";
import { PERSONAS } from "@/lib/auth/personas";
import { signInAs } from "@/lib/auth/server";

// The front door. Four personas, no passwords, because the point of this screen is not to demonstrate
// a login form: it is to make "who is asking" a thing you can change in one click and watch the whole
// app change with it. The reviewer gets test credentials without ever typing one.
//
// In production this screen does not exist. The same principal arrives from Okta through eve's oidc()
// authenticator, and seOwner comes from a group claim instead of this list. Everything downstream, the
// scoped queries and the scoped tools, is unchanged by that swap, which is the reason the persona
// shape is this thin.

export default function SignInPage() {
  async function choose(formData: FormData) {
    "use server";
    const id = String(formData.get("persona"));
    const persona = PERSONAS.find((p) => p.id === id);
    if (!persona) redirect("/signin");
    await signInAs(persona);
    redirect("/dashboard");
  }

  return (
    <main className="grid min-h-dvh place-items-center bg-background px-6 text-foreground">
      <div className="w-full max-w-lg">
        <div className="flex items-center gap-2 font-medium">
          <span className="inline-block size-2 rounded-full bg-emerald-500" aria-hidden />
          Steve
        </div>
        <h1 className="mt-4 font-semibold text-2xl tracking-tight">Who is asking?</h1>
        <p className="mt-1 text-muted-foreground text-sm">
          Steve reads the accounts you own, so pick a person. No password: these are demo personas,
          and in production this is your identity provider.
        </p>

        <div className="mt-6 space-y-2">
          {PERSONAS.map((persona) => (
            <form action={choose} key={persona.id}>
              <input type="hidden" name="persona" value={persona.id} />
              <button
                type="submit"
                className="w-full rounded-xl border border-border bg-card p-4 text-left transition-colors hover:border-foreground/30"
              >
                <div className="flex items-center justify-between gap-4">
                  <span className="font-medium">{persona.name}</span>
                  <span className="text-muted-foreground text-xs uppercase tracking-wide">
                    {persona.role === "leadership" ? "all accounts" : persona.seOwner}
                  </span>
                </div>
                <div className="mt-1 text-muted-foreground text-sm">{persona.blurb}</div>
              </button>
            </form>
          ))}
        </div>
      </div>
    </main>
  );
}
