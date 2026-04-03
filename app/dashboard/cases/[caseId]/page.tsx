import { redirect } from "next/navigation";

export default async function CasePage({
  params,
}: {
  params: Promise<{ caseId: string }>;
}) {
  const { caseId } = await params;
  redirect(`/dashboard/cases/${caseId}/timeline`);
}
