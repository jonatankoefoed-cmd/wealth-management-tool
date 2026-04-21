import { DebtTab } from "@/components/input/debt-tab";

export const metadata = {
  title: "Gæld | Wealth Management",
  description: "Administrer din eksisterende gæld og SU-lån overblik",
};

export default function DebtPage() {
  return (
    <div className="mx-auto w-full max-w-5xl animate-fade-in-up pb-10 space-y-8">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold tracking-tight text-brand-text1">Din Gæld</h1>
        <p className="text-brand-text2">Få kontrol over dit SU-lån og se udviklingen i rentetilskrivning samt netto restgæld.</p>
      </div>

      <DebtTab />
    </div>
  );
}
