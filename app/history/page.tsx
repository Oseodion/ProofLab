import { HistoryList } from "@/components/history-list";
import { PageShell } from "@/components/page-shell";

export const metadata = {
  title: "History",
  description: "Local attestation and DVC task history stored in this browser.",
};

export default function HistoryPage() {
  return (
    <PageShell
      eyebrow="This browser"
      title="Task history"
      lede="Attestations and DVC submits are stored in localStorage on this device. Each row says whether it is a zkTLS attestation or a DVC computation."
    >
      <HistoryList />
    </PageShell>
  );
}
