import { getClients } from "@/features/clients/actions";
import { ClientList } from "@/features/clients/components/client-list";
import { CreateClientModal } from "@/features/clients/components/create-client-modal";

export const metadata = {
  title: "Clients | AIC Nex OS",
};

export default async function ClientsPage() {
  const clients = await getClients();

  return (
    <div className="flex-1 space-y-4 p-8 pt-6">
      <div className="flex items-center justify-between space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Clients</h2>
        <div className="flex items-center space-x-2">
          <CreateClientModal />
        </div>
      </div>
      <ClientList clients={clients} />
    </div>
  );
}
