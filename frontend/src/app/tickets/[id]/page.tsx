import TicketClient from './TicketClient';

export const dynamic = 'force-dynamic';

export default function Page({ params }: { params: { id: string } }) {
  return <TicketClient id={params.id} />;
}
