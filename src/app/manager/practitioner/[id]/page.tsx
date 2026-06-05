import { redirect } from "next/navigation";

export default function PractitionerPage({ params }: { params: { id: string } }) {
  redirect(`/manager/appointments?open=${params.id}`);
}
