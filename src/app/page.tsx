import { AnalyzerApp } from "@/components/AnalyzerApp";
import { isAuthEnabled } from "@/lib/site-auth";

export default function Home() {
  return <AnalyzerApp showLogout={isAuthEnabled()} />;
}
