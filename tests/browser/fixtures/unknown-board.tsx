import { createRoot } from 'react-dom/client';
import { OverviewView } from '../../../src/views/OverviewView';
import type { Data } from '../../../src/repository';
import seed from '../../../src/seed.json';
import '../../../src/style.css';

const data = structuredClone(seed) as Data;
data.orders = [{ ...data.orders[0], repair: 'Estado no previsto' }];
const noop = () => {};
createRoot(document.getElementById('root')!).render(
  <OverviewView data={data} stats={{ active: 1, collected: 0, pending: 0, leads: 0 }}
    onViewOrders={noop} onCreateRepair={noop} onCreateClient={noop} onCreateExpense={noop} />,
);
