import { Suspense } from "react";
import { LoginPageClient } from "@/app/login/LoginPageClient";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginPageClient />
    </Suspense>
  );
}
